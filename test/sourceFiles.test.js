const fs = require('fs')
const path = require('path')
const test = require('ava')

/* lib files */
const base = require('../lib/basicParsers')
const parser = require('../lib/parser').programParser
const typeInfer = require('../lib/typeInference')

/* test and assert files */
const [srcFiles, assertFiles] = [path.join(__dirname, '/src'), path.join(__dirname, '/assert')]

const initObj = (input, line = 1, column = 0) => ({str: input, line, column})

const generateTree = input => {
  const parseResult = base.includeParser(input)
  let rest = input
  if (parseResult !== null) {
    [, rest] = parseResult
  }
  const tree = parser(rest)
  if (tree.error) return tree
  const newTree = typeInfer(tree.body)
  if (newTree.error) return newTree
  tree.body = newTree
  return tree
}

const readFileContent = file => fs.readFileSync(file, 'utf8')

const searchAndTest = (tests, assert) => {
  if (fs.existsSync(tests)) {
    fs.readdirSync(tests).forEach(function (file, index) {
      const curPath = path.join(tests, '/', file)
      const pathParse = path.parse(curPath)
      if (fs.lstatSync(curPath).isDirectory()) {
        searchAndTest(curPath, path.join(assert, '/', file))
      } else if (pathParse.ext === '.cl') {
        const input = initObj(readFileContent(path.join(pathParse.dir, `${pathParse.name}.cl`)))
        const assertJson = path.join(assert, `${pathParse.name}.json`)
        const jsonValue = require(assertJson)
        const tree = generateTree(input)
        test(file, t => {
          t.deepEqual(tree, jsonValue)
        })
      }
    })
  }
}
searchAndTest(srcFiles, assertFiles)
