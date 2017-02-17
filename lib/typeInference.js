const errorTemplate = require('./estemplate').error
const globalTypesObj = {}

const isFunction = (id, typeObj) => typeObj[id] !== undefined && typeObj[id] !== null && typeObj[id].type === 'function'

const getParamReturnTypes = (id, typeObj) => [typeObj[id.name].paramTypes, typeObj[id.name].returnType]

const isArray = (id, typeObj) => typeObj[id] !== undefined && typeObj[id] !== null && typeObj[id].type === 'array'

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
    return type === expectedType || expectedType === 'bool' ? type : type === 'needsInference' ? type : null
  }
}

const checkTypes = (expr, expectedType, localTypeObj, id) => {
  let typeLeft = getType(expr.left, expectedType, localTypeObj, id)
  let typeRight = getType(expr.right, expectedType, localTypeObj, id)
  if (typeLeft === 'needsInference' && typeRight !== 'needsInference') {
    assignTypeToUninferredIdentifier(expr, typeRight, localTypeObj)
    typeLeft = typeRight
  }
  if (typeLeft !== 'needsInference' && typeRight === 'needsInference') {
    assignTypeToUninferredIdentifier(expr, typeLeft, localTypeObj)
    typeRight = typeLeft
  }
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
  if (consequentType === 'needsInference' && alternateType !== 'needsInference' && alternateType !== null) consequentType = alternateType
  if (consequentType !== 'needsInference' && alternateType === 'needsInference' && consequentType !== null) alternateType = consequentType
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
    if (globalTypesObj[id] !== undefined && globalTypesObj[id].type === 'function' && globalTypesObj[id].returnType !== 'needsInference') return {flag: false}
    globalTypesObj[id] = {type: 'function', paramTypes: args, returnType: 'needsInference'}
    return {flag: true, paramTypes: args}
  }
  return {flag: false}
}

const callExprType = (expr, localTypeObj = {}, id) => {
  let [params, body, args] = [expr.callee.params, expr.callee.body, expr.arguments]
  if (expr.sType !== undefined) return expr.sType // if call has type already set
  if (params !== undefined && body !== undefined && !(isEmpty(localTypeObj))) {
    let typesOfParams = mapArgTypeToParams(params, args)
    params.map((param, index) => {
      localTypeObj[param.name] = typesOfParams[index]
      return param
    })
    return exprType(body, localTypeObj, id)
  }
  let isRecursive = checkForRecursion(expr.callee.name, id, localTypeObj, args)
  let result = exprType(expr.callee, localTypeObj, id)
  if (result === null) return null
  let [acceptedTypes, returnType] = result
  if (isRecursive.flag) acceptedTypes = isRecursive.paramTypes
  return matchArgTypesToAcceptedTypes(args, acceptedTypes, localTypeObj, id) ? returnType : null
}

const reduceTypes = (typesArr, localTypeObj, id) => {
  let reducedType = typesArr.map(e => {
    if (e.type !== undefined && e.type === 'Identifier') return {id: e.name, type: exprType(e, localTypeObj, id)}
    return {id: null, type: exprType(e, localTypeObj, id)}
  }).reduce((exp1, exp2) => {
    if (exp1.type === 'needsInference' && exp2.type !== 'needsInference' && exp2.type !== null) {
      localTypeObj[exp1.id] = exp2.type
      exp1.type = exp2.type
    }
    if (exp2.type === 'needsInference' && exp1.type !== 'needsInference') {
      exp2.type = exp1.type
      localTypeObj[exp2.id] = exp1.type
    }
    return exp1.type === exp2.type ? exp1 : false
  })
  return reducedType !== false ? reducedType.type : false
}

const switchStatementType = (body, localTypeObj, id) => {
  let cases = body.cases
  let [initialPattern] = cases
  let [returnType, acceptedType] = [
    initialPattern.consequent[0].argument,
    initialPattern.test].map(exp => exprType(exp, localTypeObj, id))
  let paramId = body.discriminant.name
  localTypeObj[paramId] = acceptedType
  let [caseArgArray, caseTestArray] = [
    cases.map(c => c.consequent[0].argument),
    cases.map(c => c.test === null ? {type: 'Identifier', name: paramId, sType: acceptedType} : c.test)]
  let checkArgsType = reduceTypes(caseArgArray, localTypeObj, id)
  let checkTestType = reduceTypes(caseTestArray, localTypeObj, id)
  globalTypesObj[id] = {type: 'function', paramTypes: makeParamTypeArray(localTypeObj, id), returnType}
  return checkArgsType === false || checkTestType === false ? null : returnType
}

const arrayExprType = (expr, localTypeObj, id) => {
  let elementTypeObj = {}
  let type = expr.elements.map((e, index) => {
    let elemType = exprType(e, localTypeObj, id)
    elementTypeObj[index] = elemType
    return elemType
  }).reduce((type1, type2) => type1 === type2 ? type1 : 'needsInference')
  let arrayType = {
    'type': 'array',
    'elemType': type === 'needsInference' ? elementTypeObj : type,
    'isHomogeneous': true
  }
  if (type === 'needsInference') {
    arrayType['isHomogeneous'] = false
  }
  return arrayType
}

const objectExprType = (expr, localTypeObj, id) => {
  let propertyTypeObj = {}
  expr.properties.map((prop) => { propertyTypeObj[prop.key.value] = exprType(prop.value, localTypeObj) })
  return {'type': 'object', 'propTypes': propertyTypeObj}
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
      return arrayExprType(expr, localTypeObj, id)
    case 'ObjectExpression':
      return objectExprType(expr, localTypeObj, id)
    case 'MemberExpression':
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
