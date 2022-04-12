const test = require('ava')

/* lib files */
const parsers = require('../lib/parser')
const templ = require('../lib/estemplate')

/* specific templates */
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

/* Exported parsers from parser.js to test */
const {
  // doBlockParser,
  // ioParser,
  // doFuncParser,
  declParser,
  ifExprParser,
  fnDeclParser,
  defineStmtParser,
  fnCallParser,
  lambdaParser,
  lambdaCallParser
} = parsers

const initObj = (input, line = 1, column = 0) => ({ str: input, line, column })

const testRunner = (value, expected, msg) => {
  test(msg, (t) => {
    t.deepEqual(value, expected)
  })
}

const ifPass = initObj('if 2 > 3 then true else false')
const ifTest = ifthen(
  binEx(num('2'), '>', num('3')),
  bool('true'),
  bool('false')
)
testRunner(ifExprParser(ifPass)[0], ifTest, 'ifExprParser')

const declPass = initObj('a = 25')
const declTest = decl(id('a'), num('25'))
testRunner(declParser(declPass)[0], declTest, 'declParser')
testRunner(declParser(ifPass), null, 'declParser')

const fnDeclPass = initObj('fact n = n * 25')
const fnDeclTest = funcDecl(
  id('fact'),
  [id('n')],
  binEx(id('n'), '*', num('25'))
)
testRunner(fnDeclParser(fnDeclPass)[0], fnDeclTest, 'fnDeclParser')

const fnCallPass = initObj('fact 5 15')
const fnCallTest = exprStmt(fnCall(id('fact'), [num('5'), num('15')]))
testRunner(fnCallParser(fnCallPass)[0], fnCallTest, 'fnCallParser')

const definePass = initObj('defineProp a \'b\' \'abcd\'')
const defineTest = define(id('a'), str('b'), str('abcd'), false)
testRunner(defineStmtParser(definePass)[0], defineTest, 'defineProp')

const lambdaPass = initObj('\\a b -> a + b')
const lambdaTest = lambda([id('a'), id('b')], binEx(id('a'), '+', id('b')))
testRunner(lambdaParser(lambdaPass)[0], lambdaTest, 'lambdaParser')

const lambdaCallPass = initObj('(\\a b -> a + b) 2 1')
const lambdaCallTest = lambdaCall(
  [id('a'), id('b')],
  [num('2'), num('1')],
  binEx(id('a'), '+', id('b'))
)
testRunner(
  lambdaCallParser(lambdaCallPass)[0],
  lambdaCallTest,
  'lambdaCallParser'
)

// const ioStmtPass = initObj(`a = putLine 'a'`)
// const ioStmtTest = decl(id('a'), ioCall(id('putLine'), [str('a')]))
// testRunner(ioParser(ioStmtPass)[0], ioStmtTest, 'ioStmt')
