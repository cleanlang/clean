const getArrowFuncDecl = decl => {
  // console.log(decl)
  let declarations = decl.declarations
  // console.log(declarations)
  if (declarations !== undefined) {
    let arrowfuncexp = declarations[0].init
    return arrowfuncexp.type === 'ArrowFunctionExpression'
  }
}

const getFunctionPatternsDecl = decl => {
  return !isFuncDecl(decl)
}

const getFunctionDecl = decl => {
  return isFuncDecl(decl)
}

const isFuncDecl = decl => {
  let declarations = decl.declarations
  // console.log(declarations)
  let funcexp = declarations[0].init
  let params = funcexp.params

  let isFunc = true
  for (let param of params) {
    if (param.type === 'Literal') {
      isFunc = false
      break
    }
  }
  return isFunc
}

const getFunctionName = decl => {
  let declarations = decl.declarations
  let id = declarations[0].id

  return id.name
}

const getMatchingPattern = (name, patternfuncdeclns) => {
  let patternarray = []
  for (let patterndecl of patternfuncdeclns) {
    let patternname = getFunctionName(patterndecl)
    if (name === patternname) {
      patternarray.push(patterndecl)
    }
  }
  return patternarray
}

const constructTest = (funcdecl, patterndecl) => {
  let testobj = {'type': 'BinaryExpression', 'operator': '==='}
  testobj.left = funcdecl.declarations[0].init.params[0]
  testobj.right = patterndecl.declarations[0].init.params[0]

  return testobj
}

const buildExplicitCases = (funcdecl, patterndecls) => {
  let patterncases = []
  for (let pattern of patterndecls) {
    let patterncase = {'type': 'SwitchCase', 'consequent': []}
    patterncase.test = pattern.declarations[0].init.params[0]
    let consequent = {'type': 'ReturnStatement'}
    consequent.argument = pattern.declarations[0].init.body
    patterncase.consequent.push(consequent)

    patterncases.push(patterncase)
  }
  return patterncases
}

const buildDefaultCase = funcdecl => {
  let defaultcase = {'type': 'SwitchCase', 'test': null, 'consequent': []}
  let consequent = {'type': 'ReturnStatement'}
  consequent.argument = funcdecl.declarations[0].init.body
  defaultcase.consequent.push(consequent)
  return defaultcase
}

const removePatterns = (declarations, patterndecls) => {
  for (let pattern of patterndecls) {
    let patternindex = declarations.findIndex(decl => getFunctionName(decl) === getFunctionName(pattern))
    declarations.splice(patternindex, 1)
  }
}

const modifyMultiPatternAst = (funcdecl, patterndecls, ast) => {
  let funcdeclbody = {'type': 'BlockStatement', 'body': []}
  let blockstmtbody = {'type': 'SwitchStatement', 'cases': []}
  blockstmtbody.discriminant = funcdecl.declarations[0].init.params[0]
  let cases = buildExplicitCases(funcdecl, patterndecls)
  cases.push(buildDefaultCase(funcdecl))
  blockstmtbody.cases = cases

  funcdeclbody.body.push(blockstmtbody)

  funcdecl.declarations[0].init.body = funcdeclbody
  funcdecl.declarations[0].init.expression = false

  removePatterns(ast.body, patterndecls)

  return ast
}

const modifySinglePatternAst = (funcdecl, patterndecls, ast) => {
  let funcdeclbody = {'type': 'ConditionalExpression'}

  funcdeclbody.test = constructTest(funcdecl, patterndecls[0])
  funcdeclbody.consequent = patterndecls[0].declarations[0].init.body
  funcdeclbody.alternate = funcdecl.declarations[0].init.body

  funcdecl.declarations[0].init.body = funcdeclbody
  funcdecl.declarations[0].init.expression = true

  removePatterns(ast.body, patterndecls)

  return ast
}

const modifyAst = (funcdecl, patterndecls, ast) => {
  if (patterndecls.length === 1) { return modifySinglePatternAst(funcdecl, patterndecls, ast) }

  return modifyMultiPatternAst(funcdecl, patterndecls, ast)
}

const restructure = (funcdecl, patternfuncdeclns, ast) => {
  let funcname = getFunctionName(funcdecl)
  let patterndecls = getMatchingPattern(funcname, patternfuncdeclns)
  let finalast = patterndecls.length === 0 ? ast : modifyAst(funcdecl, patterndecls, ast)

  return finalast
}

const getFunctionDeclarations = ast => {
  let declarations = ast.body
  // console.log(declarations)
  let arrowfuncdeclns = declarations.filter(getArrowFuncDecl)
  let patternfuncdeclns = arrowfuncdeclns.filter(getFunctionPatternsDecl)
  let funcdeclns = arrowfuncdeclns.filter(getFunctionDecl)

  for (let decl of funcdeclns) {
    ast = restructure(decl, patternfuncdeclns, ast)
  }
  return ast
}

const updateAst = ast => getFunctionDeclarations(ast)

/*
const test = () => {
  const tree = updateAst(ast)
  console.log(JSON.stringify(tree, null, 4))
}

test()
*/
/*  Module Exports estemplate  */
module.exports = updateAst
