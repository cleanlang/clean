const argParser = require('yargs')
const escodegen = require('escodegen')
const fs = require('fs')
const parser = require('./parser')
const childProcess = require('child_process')
const inferTypes = require('./typeInference')
const argv = argParser(process.argv.slice(2)).argv
const pckgJSON = JSON.parse(fs.readFileSync('../clean/package.json').toString())
const help = `
  Usage :
  clean <filename.cl>                     Compile and run <filename.cl>
  clean <filename.cl> -o <outputFile.js>  Compiles result to <outputFile.js>(as mentioned by the user)
  clean -v                                Version
  clean <filename> --ast                  Output AST to the the console

clean@${pckgJSON.version}`

if (argv.h || argv.help) console.log(help)
if (argv.v) console.log(pckgJSON.version)
const infile = argv._[0]
if (infile) {
  const typeInferenceDisabled = argv.t !== undefined
  const showAst = argv.ast !== undefined
  const src = fs.readFileSync(infile, 'utf8').toString()
  const tree = parser({'str': src, 'line': 1, 'column': 0, 'indent': 0})
  const outfile = argv.o ? argv.o.replace(/\.cl$/, '.js') : infile.replace(/\.cl$/, '.js')
  if (showAst) console.log(JSON.stringify(tree, null, 2))
  if (tree instanceof SyntaxError) {
    let err = tree
    err.message += ` in ${infile}`
    console.error(err)
  } else {
    tree.body = typeInferenceDisabled ? tree.body : inferTypes(tree.body)
    const out = escodegen.generate(tree, {comment: true}).replace(/;/g, '')
    fs.writeFileSync(outfile, out, 'utf8')
    if (!argv.o) childProcess.execSync('node ' + outfile, {stdio: 'inherit'})
  }
}
