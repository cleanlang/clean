const argParser = require("yargs");
const cli = require("./cli");
const argv = argParser(process.argv.slice(2)).argv;
cli(argv);
