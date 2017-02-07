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
    case 'CallExpression':
      callExpressionCheck(expr)
      break
    default:
      return expr
  }
}

const exprType = (expr, localTypeObj = {}, id = null) => {
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
      return arrowFunctionExprType(expr, localTypeObj, id)
    case 'MemberExpression':
      return memberExprType(expr, localTypeObj)
    case 'BlockStatement':
      return blockStatementType(expr, localTypeObj, id)
    case 'SwitchStatement':
      return switchStatementType(expr, localTypeObj, id)
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

const arrowFunctionExprType = (expr, localTypeObj, id) => {
  let [params, body] = [expr.params, expr.body]
  params.map(param => { localTypeObj[param.name] = 'needsInference' })
  let returnType = exprType(body, localTypeObj, id)
  return returnType === null ? null : {type: 'function', paramTypes: makeParamTypeArray(localTypeObj), returnType}
}

const matchArgTypesToAcceptedTypes = (args, acceptedTypes, localTypeObj) => args.map(
  (arg, index) => exprType(arg, localTypeObj) === acceptedTypes[index])
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
  return matchArgTypesToAcceptedTypes(args, acceptedTypes, localTypeObj) ? returnType : null
}
// TODO
// const memberExprType = (expr, localTypeObj) => {
//   return expr
// }

const reduceTypes = (typesArr, localTypeObj) => (
  typesArr.map(e => exprType(e, localTypeObj))
          .reduce((type1, type2) => type1 === type2 ? type1 : false))

const switchStatementType = (body, localTypeObj, id) => {
  let cases = body.cases
  let [initialPattern] = cases

  let [returnType, acceptedType] = [
    initialPattern.consequent[0].argument,
    initialPattern.test].map(e => exprType(e, localTypeObj))

  let paramId = body.discriminant.name

  localTypeObj[paramId] = acceptedType
  globalTypesObj[id] = {type: 'function', paramTypes: makeParamTypeArray(localTypeObj), returnType}
  let [caseArgArray, caseTestArray] = [
    cases.map(c => c.consequent[0].argument),
    cases.map(c => c.test === null ? {type: 'Identifier', name: paramId, sType: acceptedType} : c.test)]

  if (reduceTypes(caseArgArray, localTypeObj) === false || reduceTypes(caseTestArray, localTypeObj) === false) return null
  return returnType
}

const blockStatementType = (stmnt, localTypeObj, id) => {
  let [expr] = stmnt.body
  return exprType(expr, localTypeObj, id)
}

const declTypeExtract = stmnt => {
  let [decl] = stmnt.declarations
  let [id, exp] = [decl.id.name, decl.init]
  let type = exprType(exp, {}, id)
  globalTypesObj[id] = type
}

const callExpressionCheck = expr => exprType(expr) === null
                                    ? (globalTypesObj[expr.callee.name] = null)
                                    : globalTypesObj[expr.callee.name]

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
