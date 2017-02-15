const errorTemplate = require('./estemplate').error
const globalTypesObj = {}

const isFunction = (id, typeObj) => typeObj[id] !== undefined && typeObj[id].type === 'function'

const getParamReturnTypes = (id, typeObj) => [typeObj[id.name].paramTypes, typeObj[id.name].returnType]

const isArray = (id, typeObj) => typeObj[id] !== undefined && typeObj[id].type === 'array'

const isEmpty = obj => obj.toString() === ''

const returnIdentifierType = (id, typeObj) => {
  if (isFunction(id.name, typeObj)) return getParamReturnTypes(id, typeObj)
  if (isArray(id.name, typeObj)) return typeObj[id.name].elemTypes
  return typeObj[id.name]
}

const identifierType = (id, localTypeObj) => {
  if (localTypeObj[id.name] !== undefined) return returnIdentifierType(id, localTypeObj)
  if (globalTypesObj[id.name] !== undefined) return returnIdentifierType(id, globalTypesObj)
  return null
}

const literalType = literal => literal.sType

const unaryExprType = expr => {
  if (expr.operator === 'typeof') return 'string'
  if (expr.operator === '!' && exprType(expr.argument) === 'bool') return 'bool'
  if (expr.operator === '-' && exprType(expr.argument) === 'number') return 'number'
  return null
}

const getType = (expr, expectedType, localTypeObj, id) => {
  if (expr !== undefined) {
    let type = exprType(expr, localTypeObj, id)
    type = type === 'needsInference' ? expectedType : type
    return type === expectedType || expectedType === 'bool' ? type : null
  }
}

const checkTypes = (expr, expectedType, localTypeObj, id) => {
  let typeLeft = getType(expr.left, expectedType, localTypeObj, id)
  let typeRight = getType(expr.right, expectedType, localTypeObj, id)
  return typeLeft === typeRight && (typeLeft === expectedType || expectedType === 'bool') ? expectedType : null
}

const assignTypeToUninferredIdentifier = (expr, inferredType, localTypeObj) => {
  if (isEmpty(localTypeObj)) return localTypeObj
  let [left, right] = [expr.left.name, expr.right.name]
  if (left !== undefined && localTypeObj[left] === 'needsInference') localTypeObj[left] = inferredType
  if (right !== undefined && localTypeObj[right] === 'needsInference') localTypeObj[right] = inferredType
}

const binaryExprType = (expr, localTypeObj, id) => {
  let assumedType = expr.sType
  if (assumedType !== 'bool') assignTypeToUninferredIdentifier(expr, assumedType, localTypeObj)
  return checkTypes(expr, assumedType, localTypeObj, id)
}

const conditionalExprType = (expr, localTypeObj, id) => {
  if (exprType(expr.test, localTypeObj, id) !== 'bool') return null
  let [consequentType, alternateType] = [exprType(expr.consequent, localTypeObj, id), exprType(expr.alternate, localTypeObj, id)]
  if (consequentType === 'needsInference' && alternateType !== 'needsInference') consequentType = alternateType
  if (consequentType !== 'needsInference' && alternateType === 'needsInference') alternateType = consequentType
  return consequentType === alternateType ? consequentType : null
}

const mapArgTypeToParams = (params, args) => {
  return params.map((param, index) => args[index].sType === undefined ? exprType(args[index]) : args[index].sType)
}

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

const matchArgTypesToAcceptedTypes = (args, acceptedTypes, localTypeObj, id) => (
  args.map((arg, index) => exprType(arg, localTypeObj, id) === acceptedTypes[index])
      .reduce((type1, type2) => type1 === type2))

const checkForRecursion = (callee, id, localTypeObj, args) => {
  if (callee === id) { /* recursive call */
    args = args.map(e => exprType(e, localTypeObj, id))
    globalTypesObj[id] = {type: 'function', paramTypes: args, returnType: 'needsInference'}
    return {flag: true, paramTypes: args}
  }
  return {flag: false}
}

const callExprType = (expr, localTypeObj = {}, id) => {
  let [params, body, args] = [expr.callee.params, expr.callee.body, expr.arguments]
  if (params !== undefined && body !== undefined && !(isEmpty(localTypeObj))) {
    let typesOfParams = mapArgTypeToParams(params, args)
    params.map((param, index) => {
      localTypeObj[param.name] = typesOfParams[index]
      return param
    })
    return exprType(body, localTypeObj, id)
  }
  let isRecursive = checkForRecursion(expr.callee.name, id, localTypeObj, args)
  let [acceptedTypes, returnType] = exprType(expr.callee, localTypeObj, id)
  if (isRecursive.flag) acceptedTypes = isRecursive.paramTypes
  return matchArgTypesToAcceptedTypes(args, acceptedTypes, localTypeObj, id) ? returnType : null
}

const reduceTypes = (typesArr, localTypeObj, id) =>
  (typesArr.map(e => exprType(e, localTypeObj, id))
           .reduce((type1, type2) => {
             if (type1 === 'needsInference' && type2 !== 'needsInference') type1 = type2
             return type1 === type2 ? type1 : false
           }))

const switchStatementType = (body, localTypeObj, id) => {
  let cases = body.cases
  let [initialPattern] = cases
  let [returnType, acceptedType] = [
    initialPattern.consequent[0].argument,
    initialPattern.test].map(exp => exprType(exp, localTypeObj, id))
  let paramId = body.discriminant.name
  localTypeObj[paramId] = acceptedType
  globalTypesObj[id] = {type: 'function', paramTypes: makeParamTypeArray(localTypeObj, id), returnType}
  let [caseArgArray, caseTestArray] = [
    cases.map(c => c.consequent[0].argument),
    cases.map(c => c.test === null ? {type: 'Identifier', name: paramId, sType: acceptedType} : c.test)]
  if (reduceTypes(caseArgArray, localTypeObj, id) === false || reduceTypes(caseTestArray, localTypeObj, id) === false) return null
  return returnType
}

const blockStatementType = (stmnt, localTypeObj, id) => {
  let [expr] = stmnt.body
  return exprType(expr, localTypeObj, id)
}

const exprType = (expr, localTypeObj = {}, id = null) => {
  if (expr.type === 'ExpressionStatement') expr = expr.expression
  let type = expr.type
  switch (type) {
    case 'Literal':
      return literalType(expr)
    case 'Identifier':
      return identifierType(expr, localTypeObj)
    case 'UnaryExpression':
      return unaryExprType(expr)
    case 'BinaryExpression':
      return binaryExprType(expr, localTypeObj, id)
    case 'CallExpression':
      return callExprType(expr, localTypeObj, id)
    case 'ConditionalExpression':
      return conditionalExprType(expr, localTypeObj, id)
    case 'ArrowFunctionExpression':
      return arrowFunctionExprType(expr, localTypeObj, id)
    case 'BlockStatement':
      return blockStatementType(expr, localTypeObj, id)
    case 'SwitchStatement':
      return switchStatementType(expr, localTypeObj, id)
    case 'ArrayExpression':
    case 'MemberExpression':
    case 'ObjectExpression':
      return 'needsInference'
    default:
      return expr
  }
}

const declTypeExtract = stmnt => {
  let [decl] = stmnt.declarations
  let [id, exp] = [decl.id.name, decl.init]
  let type = exprType(exp, {}, id)
  globalTypesObj[id] = type
}

const callExpressionCheck = expr => exprType(expr) === null
                                    ? (globalTypesObj[expr.callee.name] = null)
                                    : (globalTypesObj[expr.callee.name])

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
