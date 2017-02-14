const argParser = require('minimist')
const escodegen = require('escodegen')
const fs = require('fs')
const parser = require('./parser')
const childProcess = require('child_process')

const argv = argParser(process.argv.slice(2))
const infile = argv._[0]
const outfile = infile.replace(/\.cl$/, '.js')
const src = fs.readFileSync(infile, 'utf8').toString()
const tree = parser({'str': src, 'line': 1, 'column': 0, 'indent': 0})
const out = escodegen.generate(tree, {comment: true})
fs.writeFileSync(outfile, out, 'utf8')
childProcess.execSync('node ' + outfile, {stdio: 'inherit'})
