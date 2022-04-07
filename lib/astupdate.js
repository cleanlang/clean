/*
  Functions in this file are used to update the AST to support for pattern matching
*/
const estemplate = require('./estemplate')
const updateComment = require('./updateComment.js')

let patterns = []

const buildExplicitCases = (funcdecl, patterndecls) => {
  const patterncases = []
  let flag = false
  for (const pattern of patterndecls) {
    const patterncase = { type: 'SwitchCase', consequent: [] }
    const patternParam = pattern.declarations[0].init.params[0]
    patterncase.test = patternParam
    if (patternParam.type === 'ArrayExpression') {
      patterncase.test = estemplate.literal('0')
      patterncase.test.sType = {
        type: 'array',
        elemTypes: {},
        commonType: 'needsInference',
        isHomogeneous: false
      }
      flag = true
    }
    const consequent = { type: 'ReturnStatement' }
    const arg = pattern.declarations[0].init.body
    consequent.argument =
      arg.type === 'ExpressionStatement' ? arg.expression : arg
    patterncase.consequent.push(consequent)

    patterncases.push(patterncase)
  }
  return [patterncases, flag]
}

const buildDefaultCase = (funcdecl) => {
  const defaultcase = { type: 'SwitchCase', test: null, consequent: [] }
  const consequent = { type: 'ReturnStatement' }
  const arg = funcdecl.declarations[0].init.body
  consequent.argument =
    arg.type === 'ExpressionStatement' ? arg.expression : arg
  defaultcase.consequent.push(consequent)
  return defaultcase
}

const formMultiPatternAst = (funcdecl, patterndecls, ast) => {
  const funcdeclbody = { type: 'BlockStatement', body: [] }
  const blockstmtbody = { type: 'SwitchStatement', cases: [] }
  const [cases, flag] = buildExplicitCases(funcdecl, patterndecls)
  const testTempl = funcdecl.declarations[0].init.params[0]
  blockstmtbody.discriminant = testTempl
  if (flag === true) {
    const lengthTempl = estemplate.identifier('length')
    blockstmtbody.discriminant = estemplate.memberExpression(
      testTempl,
      lengthTempl
    ).expression
  }
  cases.push(buildDefaultCase(funcdecl))
  blockstmtbody.cases = cases

  funcdeclbody.body.push(blockstmtbody)

  funcdecl.declarations[0].init.body = funcdeclbody
  funcdecl.declarations[0].init.expression = false

  return funcdecl
}

const isArrowFuncDecl = (decl) => {
  const declarations = decl.declarations

  if (
    declarations !== undefined &&
    declarations[0].init.type === 'ArrowFunctionExpression'
  ) { return true }
  return false
}

const isFunction = (decl) => {
  const declarations = decl.declarations
  const funcexp = declarations[0].init
  const params = funcexp.params

  let isFunc = true
  for (const param of params) {
    if (
      param.type === 'Literal' ||
      param.type === 'ArrayExpression' ||
      param.type === 'ObjectExpression'
    ) {
      isFunc = false
      break
    }
  }
  return isFunc
}

const formFunctionAst = (funcdecl, patterndecls) => {
  const patternscount = patterndecls.length
  return patternscount === 0
    ? funcdecl
    : formMultiPatternAst(funcdecl, patterndecls)
}

const processSubTree = (decl) => {
  if (isArrowFuncDecl(decl)) {
    if (isFunction(decl)) {
      // funcdeclns
      const funcast = formFunctionAst(decl, patterns)
      patterns = []
      return funcast
    } else {
      // patternfuncdeclns
      patterns.push(decl)
      return null
    }
  }
  return decl
}

const updateAst = (mayBeAst) => {
  const ast = mayBeAst
  let newbody = []
  const declarations = ast.body

  declarations.forEach((decl) => {
    const subtree = processSubTree(decl)
    if (subtree !== null) newbody.push(subtree)
  })
  newbody = updateComment(newbody, ast)
  ast.body = newbody
  return ast
}

/*  Module Exports estemplate  */
module.exports = updateAst
