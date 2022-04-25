const fs = require('fs')
const path = require('path')
const childProcess = require('child_process')
const escodegen = require('escodegen')
const chokidar = require('chokidar')

const includeParser = require('./basicParsers').includeParser
const parser = require('./parser').programParser
const inferTypes = require('./typeInference')

const version = require(path.join(
  __dirname,
  '../package.json'
)).version

const help = `
  Usage :
  clean <filename.cl>                     Compile and run <filename.cl>
  clean <filename.cl> -o <outputFile.js>  Compiles result to <outputFile.js>
  clean <foldername> -w                   Watch folder for changes, compiles and runs
  clean <filename.cl> -w                     Watch file for changes, compiles and runs
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

const showAndExit = (str, type = 'log') => {
  console[type](str)
  process.exit()
}

const makeErrStr = (obj, infile) => {
  const strLen = obj.str.length - 1
  const whatErr = `Syntax Error at\n\n${obj.str}\n`
  const whereErr = ' '.repeat(strLen < 0 ? 0 : strLen) + '^'
  const errMsg = `\n ...at line: ${obj.line} column: ${obj.column} msg: ${obj.msg} in ${infile}\n`
  return whatErr + whereErr + errMsg
}

const importCore = (libName) => {
  const importPath = path.join(__dirname, '/include/')
  return (
    fs.readFileSync(importPath + 'core.js', 'utf8').toString() +
    fs.readFileSync(importPath + libName + '.js', 'utf8').toString() +
    '\n'.repeat(2) +
    (libName === 'node-core' ? 'global.IO = IO' : 'window.IO = IO') +
    '\n'.repeat(2)
  )
}

const evalFunction = (argsObj, infile, outfile) => {
  const input = {
    str: fs.readFileSync(infile, 'utf8').toString(),
    line: 1,
    column: 0
  }
  const includeParsedResult = includeParser(input)
  const [libName = null, program = input] = includeParsedResult || []
  const core = libName ? importCore(libName) : ''
  const tree = parser(program)
  if (tree.error) showAndExit(makeErrStr(tree, infile))
  const maybeTypeErr = argsObj.t ? null : inferTypes(tree.body)
  if (maybeTypeErr !== null) showAndExit(maybeTypeErr.message)
  if (argsObj.ast) showAndExit(JSON.stringify(tree, null, 2))
  const out = escodegen.generate(tree, { format, comment: true })
  fs.writeFileSync(outfile, core + out + '\n', 'utf8')
  const commandLineArgs = argsObj._.slice(1)
  if (!argsObj.o) {
    const mayBeCliArgs =
      commandLineArgs.length > 0 ? ' ' + commandLineArgs.join(' ') : ''
    childProcess.execSync('node ' + outfile + mayBeCliArgs, {
      stdio: 'inherit'
    })
  }
}

const watcher = (file) =>
  chokidar.watch(file, {
    ignored: /(^|[/\\])\../,
    persistent: true
  })

const isDirectory = (dir) =>
  fs.lstatSync(path.join(process.cwd(), dir)).isDirectory()

const makeDir = (folder) => {
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder)
  }
}

const rmvFile = (file) => {
  if (fs.existsSync(file)) {
    fs.unlinkSync(file)
  }
}

const fileWatcher = (argsObj, outfile, changedInpfile) => {
  const infilePathObj = path.parse(changedInpfile)
  if (infilePathObj.ext === '.cl') {
    const infilePath = path.join(infilePathObj.dir, infilePathObj.base)
    const subFolder = infilePathObj.dir.split('/').slice(1).join('/')
    const outfolderPath = isDirectory(outfile)
      ? path.join(outfile, subFolder)
      : infilePathObj.dir
    makeDir(outfolderPath)
    const outfilePath = path.join(
      outfolderPath,
      `${infilePathObj.name}.js`
    )
    console.log(`>> ${changedInpfile}`)
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
      const curPath = outFolder + '/' + file
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
    const outfilePath = path.join(
      outfile,
      subFolder,
      `${rmvfilePathObj.name}.js`
    )
    rmvFile(outfilePath)
  }
}

module.exports = (argsObj) => {
  const inputArg = argsObj._[0]
  const isWatchMode = argsObj.w
  if (!inputArg && !isWatchMode) {
    if (argsObj.v) showAndExit(version)
    showAndExit(help)
  }
  if (!isDirectory(inputArg)) {
    const fileExt = path.parse(inputArg).ext
    if (fileExt !== '.cl') {
      showAndExit(`${inputArg} is not a Clean file`, 'error')
    }
  }
  if (inputArg && !isWatchMode) {
    const outfile = argsObj.o || inputArg.replace(/\.cl$/, '.js')
    evalFunction(argsObj, inputArg, outfile)
  } else if (isWatchMode) {
    watcher(inputArg)
      .on('ready', () =>
        console.log('initial scan complete && CHOKIDAR Watching files')
      )
      .on('addDir', (addedDir) => createFolder(inputArg, addedDir))
      .on('add', (addedFile) =>
        fileWatcher(argsObj, inputArg, addedFile)
      )
      .on('change', (changedFile) =>
        fileWatcher(argsObj, inputArg, changedFile)
      )
      .on('unlinkDir', (unlinkedDir) =>
        removeFolder(inputArg, unlinkedDir)
      )
      .on('unlink', (unlinkedFile) =>
        removeFile(inputArg, unlinkedFile)
      )
      .on('error', (error) => console.log(`Watcher error: ${error}`))
  }
}
