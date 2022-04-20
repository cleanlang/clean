/*
  Functions in this file are used to update the AST to support for pattern matching
*/
const estemplate = require('./estemplate')
const updateComment = require('./updateComment.js')

let patterns = []

const buildExplicitCases = (patterndecls) => {
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

const formMultiPatternAst = (funcDecl, patternDecls) => {
  const funcDeclBody = { type: 'BlockStatement', body: [] }
  const blockStmtBody = { type: 'SwitchStatement', cases: [] }
  const [cases, flag] = buildExplicitCases(patternDecls)
  const testTempl = funcDecl.declarations[0].init.params[0]
  blockStmtBody.discriminant = testTempl
  if (flag === true) {
    const lengthTempl = estemplate.identifier('length')
    blockStmtBody.discriminant = estemplate.memberExpression(
      testTempl,
      lengthTempl
    ).expression
  }
  cases.push(buildDefaultCase(funcDecl))
  blockStmtBody.cases = cases

  funcDeclBody.body.push(blockStmtBody)

  funcDecl.declarations[0].init.body = funcDeclBody
  funcDecl.declarations[0].init.expression = false

  return funcDecl
}

const formStaticPatternAst = (patternDecls) => {
  const funcDeclBody = { type: 'BlockStatement', body: [] }
  const blockStmtBody = { type: 'SwitchStatement', cases: [] }
  const [cases] = buildExplicitCases(patternDecls)
  blockStmtBody.cases = cases
  const param = estemplate.identifier('x')
  blockStmtBody.discriminant = param
  funcDeclBody.body.push(blockStmtBody)
  return estemplate.funcDeclaration(
    estemplate.identifier(functionName(patternDecls[0])),
    [param],
    funcDeclBody
  )
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

const functionName = (decl = {}) => {
  const declarations = decl.declarations || null
  if (!declarations) return null
  const name = declarations[0].id.name
  return name
}

const formFunctionAst = (funcDecl, patternDecls) => {
  const patternsCount = patternDecls.length
  return patternsCount === 0
    ? funcDecl
    : formMultiPatternAst(funcDecl, patternDecls)
}

const processSubTree = (decl, nextDecl) => {
  if (isArrowFuncDecl(decl)) {
    if (isFunction(decl)) {
      // function declarations
      const funcAst = formFunctionAst(decl, patterns)
      patterns = []
      return funcAst
    } else if (patterns.length > 0 &&
      (!nextDecl || functionName(nextDecl) !== functionName(patterns[0]))
    ) {
      // static patten matching without variable
      patterns.push(decl)
      const patternFuncAst = formStaticPatternAst(patterns)
      patterns = []
      return patternFuncAst
    } else {
      // pattern matched function declarations
      patterns.push(decl)
      return null
    }
  }
  return decl
}

const updateAst = (ast) => {
  let newBody = []
  const declarations = ast.body
  declarations.forEach((decl, i) => {
    const nextDecl = declarations[i + 1] || null
    const subtree = processSubTree(decl, nextDecl)
    if (subtree !== null) newBody.push(subtree)
  })
  newBody = updateComment(newBody)
  ast.body = newBody
  return ast
}

/*  Module Exports estemplate  */
module.exports = updateAst
