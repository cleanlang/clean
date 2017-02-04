const errorTemplate = require('./estemplate').error
const globalTypesObj = {}

const getType = (expr, expectedType, localTypeObj) => {
  if (expr !== undefined) {
    let type = exprType(expr, localTypeObj)
    return type === expectedType || expectedType === 'bool' ? type : null
  }
}

const checkTypes = (expr, expectedType, localTypeObj) => {
  let typeLeft = getType(expr.left, expectedType, localTypeObj)
  let typeRight = getType(expr.right, expectedType, localTypeObj)
  return typeLeft === typeRight && (typeLeft === expectedType || expectedType === 'bool') ? expectedType : null
}

const statementType = expr => {
  let type = expr.type
  switch (type) {
    case 'VariableDeclaration':
      declTypeExtract(expr)
      break
    default:
      return expr
  }
}

const exprType = (expr, localTypeObj = {}) => {
  let type = expr.type
  switch (type) {
    case 'Literal':
      return literalType(expr)
    case 'Identifier':
      return identifierType(expr, localTypeObj)
    case 'UnaryExpression':
      return unaryExprType(expr)
    case 'BinaryExpression':
      return binaryExprType(expr, localTypeObj)
    case 'CallExpression':
      return callExprType(expr, localTypeObj)
    case 'ConditionalExpression':
      return conditionalExprType(expr)
    case 'ArrowFunctionExpression':
      return arrowFunctionExprType(expr)
    case 'MemberExpression':
      return memberExprType(expr, localTypeObj)
    default:
      return expr
  }
}

const literalType = literal => literal.sType

const isFunction = (id, typeObj) => typeObj[id] !== undefined && typeObj[id].type === 'function'

const getParamReturnTypes = (id, typeObj) => [typeObj[id.name].paramTypes, typeObj[id.name].returnType]

const returnIdentifierType = (id, typeObj) => isFunction(id.name, typeObj) ? getParamReturnTypes(id, typeObj) : typeObj[id.name]

const identifierType = (id, localTypeObj) => (
    localTypeObj[id.name] !== undefined ? returnIdentifierType(id, localTypeObj)
    : globalTypesObj[id.name] !== undefined ? returnIdentifierType(id, globalTypesObj)
    : null)

const unaryExprType = expr => {
  if (expr.operator === 'typeof') return 'string'
  if (expr.operator === '!' && exprType(expr.argument) === 'bool') return 'bool'
  if (expr.operator === '-' && exprType(expr.argument) === 'number') return 'number'
  return null
}

const assignTypeToUninferredIdentifier = (inferredType, localTypeObj) => {
  if (isEmpty(localTypeObj)) return localTypeObj
  for (let identifier in localTypeObj) {
    if (localTypeObj[identifier] === 'needsInference') {
      localTypeObj[identifier] = inferredType
    }
  }
  return localTypeObj
}

const binaryExprType = (expr, localTypeObj) => {
  let assumedType = expr.sType
  assignTypeToUninferredIdentifier(assumedType, localTypeObj)
  return checkTypes(expr, assumedType, localTypeObj)
}

const conditionalExprType = expr => {
  if (exprType(expr.test) !== 'bool') return null
  return exprType(expr.consequent) === exprType(expr.alternate) ? exprType(expr.consequent) : null
}

const mapArgTypeToParams = (params, args) => {
  return params.map((param, index) => args[index].sType === undefined ? exprType(args[index]) : args[index].sType)
}

const isEmpty = obj => obj.toString() === ''

const makeParamTypeArray = (localTypeObj) => {
  let paramTypes = []
  for (let identifier in localTypeObj) {
    paramTypes.push(localTypeObj[identifier])
  }
  return paramTypes
}

const arrowFunctionExprType = expr => {
  let [params, body] = [expr.params, expr.body]
  let localTypeObj = {}
  params.map(param => { localTypeObj[param.name] = 'needsInference' })
  let returnType = exprType(body, localTypeObj)
  return {type: 'function', paramTypes: makeParamTypeArray(localTypeObj), returnType}
}

const matchArgTypesToAcceptedTypes = (args, acceptedTypes) => args
      .map((arg, index) => exprType(arg) === acceptedTypes[index])
      .reduce((type1, type2) => type1 === type2)

const callExprType = (expr, localTypeObj = {}) => {
  let [params, body, args] = [expr.callee.params, expr.callee.body, expr.arguments]
  if (params !== undefined && body !== undefined && !(isEmpty(localTypeObj))) {
    let typesOfParams = mapArgTypeToParams(params, args)
    params.map((param, index) => {
      localTypeObj[param.name] = typesOfParams[index]
      return param
    })
    return exprType(body, localTypeObj)
  }
  let [acceptedTypes, returnType] = exprType(expr.callee, localTypeObj)
  return matchArgTypesToAcceptedTypes(args, acceptedTypes) ? returnType : null
}

// TODO
// const memberExprType = (expr, localTypeObj) => {
//   let id = expr.object
//   return exprType(id, localTypeObj)
// }

const declTypeExtract = stmnt => {
  let [decl] = stmnt.declarations
  let [id, exp] = [decl.id, decl.init]
  let type = exprType(exp)
  globalTypesObj[id.name] = type
}

const types = body => {
  body.map(statementType)
  let error = null
  for (let decl in globalTypesObj) {
    if (globalTypesObj[decl] === null) {
      error = errorTemplate(`${decl} is not defined`)
      break
    }
  }
  return error !== null ? [error] : body
}

/*  Module Exports types  */
module.exports = types
