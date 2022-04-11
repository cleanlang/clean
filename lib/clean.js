const argParser = require('yargs')

const genCore = require('./gen-core')
const cli = require('./cli')

const argv = argParser(process.argv.slice(2)).argv
genCore()
cli(argv)
