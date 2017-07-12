const fs = require('fs')
const escodegen = require('escodegen')
const includeParser = require('./basicParsers').includeParser
const parser = require('./parser').programParser
const childProcess = require('child_process')
const inferTypes = require('./typeInference')
const path = require('path')
const chokidar = require('chokidar')
const version = require(path.join(__dirname, '../package.json')).version
const help = `
  Usage :
  clean <filename.cl>                     Compile and run <filename.cl>
  clean <filename.cl> -o <outputFile.js>  Compiles result to <outputFile.js>
  clean -v                                Version
  clean <filename.cl> --ast               Output AST to the the console
  clean <filename.cl> -t                  Disable type inference

clean@${version}`

const format = {
  indent: {
    style: '  ',
    base: 0,
    adjustMultilineComment: false
  },
  newline: '\n',
  space: ' ',
  json: false,
  renumber: false,
  hexadecimal: false,
  quotes: 'single',
  escapeless: false,
  compact: false,
  parentheses: true,
  semicolons: false,
  safeConcatenation: false
}

const showAndExit = str => {
  console.log(str)
  process.exit()
}

const minify = str => str.replace(/\n/g, '').replace(/ {2,}/g, '').replace(/\/\*.*\*\//g, '')

const makeErrStr = (obj, infile) => {
  const strLen = obj.str.length - 1
  const whatErr = `Syntax Error at\n\n${obj.str}\n`
  const whereErr = ' '.repeat(strLen < 0 ? 0 : strLen) + '^'
  const errMsg = `\n ...at line: ${obj.line} column: ${obj.column} msg: ${obj.msg} in ${infile}\n`
  return whatErr + whereErr + errMsg
}

const evalFunction = (argsObj, infile, outfile) => {
  let input = {'str': fs.readFileSync(infile, 'utf8').toString(),
    'line': 1,
    'column': 0}
  const parseResult = includeParser(input)
  let importCore = ''
  if (parseResult !== null) {
    const [libName, newInput] = parseResult
    const importPath = path.join(__dirname, '/include/')
    importCore = minify(fs.readFileSync(importPath + 'core.js', 'utf8').toString() +
                        fs.readFileSync(importPath + libName + '.js', 'utf8').toString()) + '\n'.repeat(2)
    importCore += (libName === 'node-core' ? 'global.IO = IO' : 'window.IO = IO') + '\n'.repeat(2)
    input = newInput
  }
  const tree = parser(input)
  if (tree.error) showAndExit(makeErrStr(tree, infile))
  if (argsObj.ast) showAndExit(JSON.stringify(tree, null, 2))
  const maybeTypeErr = argsObj.t ? tree.body : inferTypes(tree.body)
  if (maybeTypeErr.error) showAndExit(JSON.stringify(maybeTypeErr))
  const out = escodegen.generate(tree, {format, comment: true})
  fs.writeFileSync(outfile, importCore + out + '\n', 'utf8')
  const commandLineArgs = argsObj._.slice(1)
  if (!argsObj.o) {
    const mayBeCliArgs = commandLineArgs.length > 0 ? ' ' + commandLineArgs.join(' ') : ''
    childProcess.execSync('node ' + outfile + mayBeCliArgs, {stdio: 'inherit'})
  }
}

const watcher = file => chokidar.watch(file, {
  ignored: /(^|[/\\])\../,
  persistent: true
})

const makeDir = folder => {
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder)
  }
}

const rmvFile = file => {
  if (fs.existsSync(file)) {
    fs.unlinkSync(file)
  }
}

const fileWatcher = (argsObj, outfile, changedInpfile) => {
  const infilePathObj = path.parse(changedInpfile)
  if (infilePathObj.ext === '.cl') {
    const infilePath = path.join(infilePathObj.dir, infilePathObj.base)
    const subFolder = infilePathObj.dir.split('/').slice(1).join('/')
    const outfolderPath = path.join(outfile, subFolder)
    makeDir(outfolderPath)
    const outfilePath = path.join(outfolderPath, `${infilePathObj.name}.js`)
    evalFunction(argsObj, infilePath, outfilePath)
  }
}

const createFolder = (outfile, changedInpfolder) => {
  const subFolder = changedInpfolder.split('/').slice(1).join('/')
  const outFolder = path.join(outfile, subFolder)
  makeDir(outFolder)
}

const rmvDir = (outFolder) => {
  if (fs.existsSync(outFolder)) {
    fs.readdirSync(outFolder).forEach(function (file, index) {
      var curPath = outFolder + '/' + file
      if (fs.lstatSync(curPath).isDirectory()) {
        rmvDir(curPath)
      } else {
        fs.unlinkSync(curPath)
      }
    })
    fs.rmdirSync(outFolder)
  }
}

const removeFolder = (outfile, changedInpfolder) => {
  const subFolder = changedInpfolder.split('/').slice(1).join('/')
  const outFolder = path.join(outfile, subFolder)
  rmvDir(outFolder)
}

const removeFile = (outfile, changedInpfile) => {
  const rmvfilePathObj = path.parse(changedInpfile)
  if (rmvfilePathObj.ext === '.cl') {
    const subFolder = rmvfilePathObj.dir.split('/').slice(1).join('/')
    const outfilePath = path.join(outfile, subFolder, `${rmvfilePathObj.name}.js`)
    rmvFile(outfilePath)
  }
}

module.exports = argsObj => {
  if (argsObj.v) showAndExit(version)
  if (argsObj.h || argsObj.help) showAndExit(help)
  const infile = argsObj._[0]
  const watchFolder = argsObj.w
  if (!infile && !watchFolder) showAndExit(help)
  const outfile = argsObj.o || infile.replace(/\.cl$/, '.js')

  if (infile) evalFunction(argsObj, infile, outfile)

  if (watchFolder) {
    watcher(watchFolder)
    .on('ready', () => console.log('initial scan complete && CHOKIDAR Watching files'))
    .on('addDir', addedDir => createFolder(outfile, addedDir))
    .on('add', addedFile => fileWatcher(argsObj, outfile, addedFile))
    .on('change', changedFile => fileWatcher(argsObj, outfile, changedFile))
    .on('unlinkDir', unlinkedDir => removeFolder(outfile, unlinkedDir))
    .on('unlink', unlinkedFile => removeFile(outfile, unlinkedFile))
  }
}
