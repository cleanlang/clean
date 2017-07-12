/*
  Functions in this file are used to update the AST to support for pattern matching
*/
const estemplate = require('./estemplate')
const updateComment = require('./updateComment.js')

let patterns = []

const buildExplicitCases = (funcdecl, patterndecls) => {
  let patterncases = []
  let flag = false
  for (let pattern of patterndecls) {
    let patterncase = {'type': 'SwitchCase', 'consequent': []}
    let patternParam = pattern.declarations[0].init.params[0]
    patterncase.test = patternParam
    if (patternParam.type === 'ArrayExpression') {
      patterncase.test = estemplate.literal('0')
      patterncase.test.sType = {
        'type': 'array',
        'elemTypes': {},
        'commonType': 'needsInference',
        'isHomogeneous': false
      }
      flag = true
    }
    let consequent = {'type': 'ReturnStatement'}
    let arg = pattern.declarations[0].init.body
    consequent.argument = arg.type === 'ExpressionStatement' ? arg.expression : arg
    patterncase.consequent.push(consequent)

    patterncases.push(patterncase)
  }
  return [patterncases, flag]
}

const buildDefaultCase = funcdecl => {
  let defaultcase = {'type': 'SwitchCase', 'test': null, 'consequent': []}
  let consequent = {'type': 'ReturnStatement'}
  let arg = funcdecl.declarations[0].init.body
  consequent.argument = arg.type === 'ExpressionStatement' ? arg.expression : arg
  defaultcase.consequent.push(consequent)
  return defaultcase
}

const formMultiPatternAst = (funcdecl, patterndecls, ast) => {
  let funcdeclbody = {'type': 'BlockStatement', 'body': []}
  let blockstmtbody = {'type': 'SwitchStatement', 'cases': []}
  let [cases, flag] = buildExplicitCases(funcdecl, patterndecls)
  let testTempl = funcdecl.declarations[0].init.params[0]
  blockstmtbody.discriminant = testTempl
  if (flag === true) {
    let lengthTempl = estemplate.identifier('length')
    blockstmtbody.discriminant = estemplate.memberExpression(testTempl, lengthTempl).expression
  }
  cases.push(buildDefaultCase(funcdecl))
  blockstmtbody.cases = cases

  funcdeclbody.body.push(blockstmtbody)

  funcdecl.declarations[0].init.body = funcdeclbody
  funcdecl.declarations[0].init.expression = false

  return funcdecl
}

const isArrowFuncDecl = decl => {
  let declarations = decl.declarations

  if (declarations !== undefined && declarations[0].init.type === 'ArrowFunctionExpression') return true
  return false
}

const isFunction = decl => {
  let declarations = decl.declarations
  let funcexp = declarations[0].init
  let params = funcexp.params

  let isFunc = true
  for (let param of params) {
    if (param.type === 'Literal' || param.type === 'ArrayExpression' || param.type === 'ObjectExpression') {
      isFunc = false
      break
    }
  }
  return isFunc
}

const formFunctionAst = (funcdecl, patterndecls) => {
  let patternscount = patterndecls.length
  return patternscount === 0 ? funcdecl : formMultiPatternAst(funcdecl, patterndecls)
}

const processSubTree = decl => {
  if (isArrowFuncDecl(decl)) {
    if (isFunction(decl)) { // funcdeclns
      let funcast = formFunctionAst(decl, patterns)
      patterns = []
      return funcast
    } else { // patternfuncdeclns
      patterns.push(decl)
      return null
    }
  }
  return decl
}

const updateAst = mayBeAst => {
  let ast = mayBeAst
  let newbody = []
  let declarations = ast.body

  declarations.forEach(decl => {
    let subtree = processSubTree(decl)
    if (subtree !== null) newbody.push(subtree)
  })
  newbody = updateComment(newbody, ast)
  ast.body = newbody
  return ast
}

/*  Module Exports estemplate  */
module.exports = updateAst
