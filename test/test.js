const fs = require('fs')
const path = require('path')
const ava = require('ava')

/* lib files */
const base = require('../lib/basicParsers')
const parsers = require('../lib/parser')
const templ = require('../lib/estemplate')
const utils = require('../lib/utilityFunctions')
const typeInfer = require('../lib/typeInference')

/* test and assert files */
const assertion = require('./basicAssertion')
const [srcFiles, assertFiles] = [path.join(__dirname, '/src'), path.join(__dirname, '/assert')]

const decl = templ.declaration
const id = templ.identifier
const num = templ.literal
const str = templ.stringLiteral
const bool = templ.boolLiteral
const binEx = templ.binaryExpression
const ifthen = templ.ifthenelse
const funcDecl = templ.funcDeclaration
const fnCall = templ.fnCall
const define = templ.defineProp
const lambda = templ.lambda
const lambdaCall = templ.lambdaCall
const exprStmt = templ.expression

const {
  programParser,
  doBlockParser,
  ioParser,
  doFuncParser,
  declParser,
  ifExprParser,
  fnDeclParser,
  defineStmtParser,
  fnCallParser,
  lambdaParser,
  lambdaCallParser
} = parsers

const initObj = (input, line = 1, column = 0) => ({str: input, line, column})

const output = (input, line, column) => [input, initObj('', line, column)]

const testRunner = (test, assert, msg) => {
  ava(msg, t => {
    t.deepEqual(test, assert)
  })
}

/* basic parsers tests start here */
for (let parser in base) {
  let valid = assertion.basic[parser]
  if (utils.notUndefined(valid)) {
    for (let input in valid) {
      let op = valid[input]
      testRunner(base[parser](initObj(input)), output(op.str, op.line, op.column), parser)
    }
  }
  valid = assertion.literal[parser]
  if (utils.notUndefined(valid)) {
    let inpTempl = valid[0]
    let checks = valid[1]
    for (let input in checks) {
      let value = base[parser](initObj(input))
      if (utils.notNull(value)) {
        value = value[0]
        delete value.cursorLoc
      }
      let output = checks[input]
      let expected = utils.isNull(output) ? null : templ[inpTempl](output)
      if (Array.isArray(output)) {
        expected = templ[inpTempl](...output)
      }
      testRunner(value, expected, parser)
    }
  }
}
/* basic parsers tests ends here */

const ifPass = initObj('if 2 > 3 then true else false')
const ifTest = ifthen(binEx(num('2'), '>', num('3')), bool('true'), bool('false'))
testRunner(ifExprParser(ifPass)[0], ifTest, 'ifExprParser')

const declPass = initObj('a = 25')
const declTest = decl(id('a'), num('25'))
testRunner(declParser(declPass)[0], declTest, 'declParser')
testRunner(declParser(ifPass), null, 'declParser')

const fnDeclPass = initObj('fact n = n * 25')
const fnDeclTest = funcDecl(id('fact'), [id('n')], binEx(id('n'), '*', num('25')))
testRunner(fnDeclParser(fnDeclPass)[0], fnDeclTest, 'fnDeclParser')

const fnCallPass = initObj('fact 5 15')
const fnCallTest = exprStmt(fnCall(id('fact'), [num('5'), num('15')]))
testRunner(fnCallParser(fnCallPass)[0], fnCallTest, 'fnCallParser')

const definePass = initObj(`defineProp a 'b' 'abcd'`)
const defineTest = define(id('a'), str('b'), str('abcd'), false)
testRunner(defineStmtParser(definePass)[0], defineTest, 'defineProp')

const lambdaPass = initObj('\\a b -> a + b')
const lambdaTest = lambda([id('a'), id('b')], binEx(id('a'), '+', id('b')))
testRunner(lambdaParser(lambdaPass)[0], lambdaTest, 'lambdaParser')

const lambdaCallPass = initObj('(\\a b -> a + b) 2 1')
const lambdaCallTest = lambdaCall([id('a'), id('b')], [num('2'), num('1')], binEx(id('a'), '+', id('b')))
testRunner(lambdaCallParser(lambdaCallPass)[0], lambdaCallTest, 'lambdaCallParser')

// const ioStmtPass = initObj(`a = putLine 'a'`)
// const ioStmtTest = decl(id('a'), ioCall(id('putLine'), [str('a')]))
// testRunner(ioParser(ioStmtPass)[0], ioStmtTest, 'ioStmt')
const generateTree = input => {
  const parseResult = base.includeParser(input)
  let rest = input
  if (parseResult !== null) {
    [, rest] = parseResult
  }
  const tree = programParser(rest)
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
      if (fs.lstatSync(curPath).isDirectory()) {
        searchAndTest(curPath, path.join(assert, '/', file))
      } else {
        const pathParse = path.parse(curPath)
        const input = initObj(readFileContent(path.join(pathParse.dir, `${pathParse.name}.cl`)))
        const assertJson = path.join(assert, `${pathParse.name}.json`)
        const jsonValue = require(assertJson)
        const tree = generateTree(input)
        testRunner(tree, jsonValue, file)
      }
    })
  }
}
searchAndTest(srcFiles, assertFiles)
