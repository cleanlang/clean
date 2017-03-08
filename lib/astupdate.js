const updateComment = require('./updateComment.js')

let patterns = []

const buildExplicitCases = (funcdecl, patterndecls) => {
  let patterncases = []
  for (let pattern of patterndecls) {
    let patterncase = {'type': 'SwitchCase', 'consequent': []}
    patterncase.test = pattern.declarations[0].init.params[0]
    let consequent = {'type': 'ReturnStatement'}
    let arg = pattern.declarations[0].init.body
    consequent.argument = arg.type === 'ExpressionStatement' ? arg.expression : arg
    patterncase.consequent.push(consequent)

    patterncases.push(patterncase)
  }
  return patterncases
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
  blockstmtbody.discriminant = funcdecl.declarations[0].init.params[0]
  let cases = buildExplicitCases(funcdecl, patterndecls)
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

const updateAst = ast => {
  if (ast instanceof Error) return ast
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
