const fs = require('fs')
const escodegen = require('escodegen')
const importParser = require('./basicParsers').importParser
const parser = require('./parser')
const childProcess = require('child_process')
const inferTypes = require('./typeInference')
const path = require('path')
const version = require(path.join(__dirname, '../package.json')).version
const help = `
  Usage :
  clean <filename.cl>                     Compile and run <filename.cl>
  clean <filename.cl> -o <outputFile.js>  Compiles result to <outputFile.js>
  clean -v                                Version
  clean <filename.cl> --ast               Output AST to the the console
  clean <filename.cl> -t                  Disable type inference

clean@${version}`

const showAndExit = str => {
  console.log(str)
  process.exit()
}

module.exports = argsObj => {
  if (argsObj.v) showAndExit(version)
  if (argsObj.h || argsObj.help) showAndExit(help)
  const infile = argsObj._[0]
  if (!infile) showAndExit(help)
  const outfile = argsObj.o || infile.replace(/\.cl$/, '.js')
  const commandLineArgs = argsObj._.slice(1)
  let src = fs.readFileSync(infile, 'utf8').toString()
  let input = {'str': src, 'line': 1, 'column': 0, 'indent': 0}
  const importCheck = importParser(input)
  let importCore = ''
  if (importCheck !== null) {
    let [libName, rest] = importCheck
    let libFilePath = path.join(__dirname, '/import/' + libName + '.js')
    input = rest
    let coreIOPath = path.join(__dirname, '/import/core.js')
    let coreIO = fs.readFileSync(coreIOPath, 'utf8').toString()
    let libFile = fs.readFileSync(libFilePath, 'utf8').toString()
    importCore = coreIO + '\n' + libFile + '\n'
  }
  const tree = parser(input)
  if (tree instanceof SyntaxError) {
    tree.message += ` in ${infile}`
    showAndExit(tree)
  }
  if (argsObj.ast) console.log(JSON.stringify(tree, null, 2))
  tree.body = argsObj.t ? tree.body : inferTypes(tree.body)
  const out = escodegen.generate(tree, {comment: true})
  fs.writeFileSync(outfile, importCore + out, 'utf8')
  if (!argsObj.o) {
    const mayBeCliArgs = commandLineArgs.length > 0 ? ' ' + commandLineArgs.join(' ') : ''
    childProcess.execSync('node ' + outfile + mayBeCliArgs, {stdio: 'inherit'})
  }
}
