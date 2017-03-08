const argParser = require('minimist')
const escodegen = require('escodegen')
const fs = require('fs')
const parser = require('./parser')
const childProcess = require('child_process')
const inferTypes = require('./typeInference')
const argv = argParser(process.argv.slice(2))
const infile = argv._[0]
const typeInferenceDisabled = argv.t !== undefined
const showAst = argv.ast !== undefined

const outfile = infile.replace(/\.cl$/, '.js')
const src = fs.readFileSync(infile, 'utf8').toString()
const tree = parser({'str': src, 'line': 1, 'column': 0, 'indent': 0})

if (showAst) console.log(JSON.stringify(tree, null, 2))

if (tree instanceof SyntaxError) {
  let err = tree
  err.message += ` in ${infile}`
  console.error(err)
} else {
  tree.body = typeInferenceDisabled ? tree.body : inferTypes(tree.body)
  const out = escodegen.generate(tree, {comment: true}).replace(/;/g, '')
  fs.writeFileSync(outfile, out, 'utf8')
  childProcess.execSync('node ' + outfile, {stdio: 'inherit'})
}
