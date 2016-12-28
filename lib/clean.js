const argParser = require('minimist')
const escodegen = require('escodegen')
const fs = require('fs')
const parser = require('./parser')

const argv = argParser(process.argv.slice(2))
const src = fs.readFileSync(argv._[0]).toString()
const tree = parser({'str': src, 'line': 1, 'column': 0, 'indent': 0})
console.log(escodegen.generate(tree))
