const fs = require('fs')
const escodegen = require('escodegen')
const parser = require('./parser')
const childProcess = require('child_process')
const inferTypes = require('./typeInference')
const pckgJSON = JSON.parse(fs.readFileSync('../clean/package.json').toString())
const help = `
  Usage :
  clean <filename.cl>                     Compile and run <filename.cl>
  clean <filename.cl> -o <outputFile.js>  Compiles result to <outputFile.js>(as mentioned by the user)
  clean -v                                Version
  clean <filename.cl> --ast               Output AST to the the console
  clean <filename.cl> -t                  Disable type inference

clean@${pckgJSON.version}`

const cliEval = (argsObj) => {
  const isFilePresent = argsObj._.length !== 0
  const infile = argsObj._[0]
  const showVersion = argsObj.v
  const showHelp = argsObj.h || argsObj.help
  const typeInferenceDisabled = argsObj.t !== undefined
  const showAst = argsObj.ast !== undefined
  const outFilePath = argsObj.o
  if (showVersion) console.log(pckgJSON.version)
  if (showHelp) console.log(help)
  if (isFilePresent) {
    const src = fs.readFileSync(infile, 'utf8').toString()
    const tree = parser({'str': src, 'line': 1, 'column': 0, 'indent': 0})
    const outfile = !outFilePath ? infile.replace(/\.cl$/, '.js') : outFilePath
    if (showAst) console.log(JSON.stringify(tree, null, 2))
    if (tree instanceof SyntaxError) {
      let err = tree
      err.message += ` in ${infile}`
      console.error(err)
    } else {
      tree.body = typeInferenceDisabled ? tree.body : inferTypes(tree.body)
      const out = escodegen.generate(tree, {comment: true}).replace(/;/g, '')
      fs.writeFileSync(outfile, out, 'utf8')
      if (!outFilePath) childProcess.execSync('node ' + outfile, {stdio: 'inherit'})
    }
  }
  if (!isFilePresent && !showHelp && !showVersion) console.log(help)
}

module.exports = cliEval
