const errorTemplate = require('./estemplate').error
const inbuiltPropSpec = require('./inbuiltMethods')
const globalTypesObj = {}

const isFunction = (id, typeObj) => typeObj[id] !== undefined && typeObj[id] !== null && typeObj[id].type === 'function'

const getParamReturnTypes = (id, typeObj) => [typeObj[id.name].paramTypes, typeObj[id.name].returnType]

const isEmpty = obj => obj.toString() === ''

const returnIdentifierType = (id, typeObj) => {
  if (isFunction(id.name, typeObj)) return getParamReturnTypes(id, typeObj)
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
  if (typeLeft === 'needsInference' && typeRight === 'needsInference') return expectedType
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
  if (consequentType === 'needsInference' && alternateType !== 'needsInference' && alternateType !== null) {
    consequentType = alternateType
    localTypeObj[expr.consequent.name] = alternateType
  }
  if (consequentType !== 'needsInference' && alternateType === 'needsInference' && consequentType !== null) {
    alternateType = consequentType
    localTypeObj[expr.alternate.name] = consequentType
  }
  return consequentType === alternateType ? consequentType : null
}

const mapArgTypeToParams = (params, args, localTypeObj, id) => {
  return params.map((param, index) => args[index].sType === undefined ? exprType(args[index], localTypeObj, id) : args[index].sType)
}

const makeParamTypeArray = (localTypeObj) => {
  let paramTypes = []
  for (let identifier in localTypeObj) {
    if (localTypeObj[identifier].type === undefined) {
      paramTypes.push(localTypeObj[identifier])
    } else {
      paramTypes.push(localTypeObj[identifier].type)
    }
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
  args.map((arg, index, arr) => {
    let type = exprType(arg, localTypeObj, id)
    if (type.type !== undefined) type = type.type
    return type === 'needsInference' || type === acceptedTypes[index] || acceptedTypes[index] === 'needsInference'
  }).reduce((type1, type2) => type1 === type2))

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
    let typesOfParams = mapArgTypeToParams(params, args, localTypeObj, id)
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
  let match = matchArgTypesToAcceptedTypes(args, acceptedTypes, localTypeObj, id)
  return match ? returnType : null
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
  if (isEmpty(expr.elements)) {
    return {
      'type': 'array',
      'elemTypes': {},
      'commonType': 'needsInference',
      'isHomogeneous': true
    }
  }
  let deducedtype = expr.elements.map((e, index) => {
    let elemType = exprType(e, localTypeObj, id)
    elementTypeObj[index] = elemType
    return elemType
  }).reduce((type1, type2) => type1 === type2 ? type1 : 'needsInference')
  let arrayType = {
    'type': 'array',
    'elemTypes': elementTypeObj,
    'commonType': (deducedtype.type !== undefined &&
                  (deducedtype.type === 'object' || deducedtype.type === 'array')
                   ? deducedtype.type : deducedtype),
    'isHomogeneous': true
  }
  if (deducedtype === 'needsInference') {
    arrayType['isHomogeneous'] = false
  }
  return arrayType
}

const objectExprType = (expr, localTypeObj, id) => {
  let propertyTypeObj = {}
  expr.properties.map((prop) => {
    if (prop.key.value === undefined) {
      propertyTypeObj[prop.key.name] = exprType(prop.value, localTypeObj)
    } else {
      propertyTypeObj[prop.key.value] = exprType(prop.value, localTypeObj)
    }
  })
  return {'type': 'object', 'propTypes': propertyTypeObj}
}

const getParentTypes = (propSpec, propName, parentId, localTypeObj) => {
  let supportedTypes = []
  for (let type in propSpec) {
    if (propSpec[type][propName] !== undefined) supportedTypes.push(type)
  }
  if (supportedTypes.length === 1) {
    localTypeObj[parentId.name] = supportedTypes[0]
  }
  return localTypeObj[parentId.name]
}

const getPropName = prop => prop.type === 'Identifier' ? prop.name
                          : prop.type === 'Literal' ? prop.raw : null

const checkForInbuiltProp = (parentType, prop) => {
  let propName = getPropName(prop)
  if (propName === null || parentType === 'needsInference') return {type: 'needsInference', id: propName} // allow
  let propSpec = inbuiltPropSpec[parentType][propName]
  if (propSpec === undefined) return {type: false, id: propName} // allow
  if (propSpec.isMutative) return {type: null, id: propName} // block
  if (propSpec.isMethod) return {type: 'function', paramTypes: propSpec.paramTypes, returnType: propSpec.returnType, id: propName} // handle no params
  if (propSpec.isProp) return {type: propSpec.returnType, id: propName}
}

const parentIsArray = (parentId, property, localTypeObj) => {
  return !(isEmpty(localTypeObj)) && localTypeObj[parentId.name] !== undefined && (property.type === 'Identifier' || property.sType === 'number') && property.isSubscript
}

const parentIsObject = (parentId, property, localTypeObj) => {
  return !(isEmpty(localTypeObj)) && localTypeObj[parentId.name] !== undefined && ((property.type === 'Identifier' && !(property.isSubscript)) || (property.sType === 'string' && property.isSubscript))
}

const getTypeOfChild = (parentObj, propsArray, parentId, localTypeObj, id) => {
  if (isEmpty(propsArray)) return parentObj
  let [prop] = propsArray
  let propSpec = checkForInbuiltProp(parentObj.type, prop)
  let propId = propSpec.id
  switch (propSpec.type) {
    case 'needsInference':
      let type = getParentTypes(inbuiltPropSpec, prop.name, parentId, localTypeObj)
      if (type === 'needsInference') return 'needsInference'
      if (typeof type === 'string') {
        localTypeObj[parentId] = type
        return getTypeOfChild({type: type}, propsArray, parentId, localTypeObj, id)
      }
      return 'needsInference'
    case null: return null // block mutative methods
    case false:
      {
        if (parentObj.type === 'object') {
          if (prop.type !== 'Literal' && prop.isSubscript) {
            let expType = exprType(prop, localTypeObj, id)
            return expType !== 'string' && expType !== undefined ? null : 'needsInference'
          }
          if (prop.sType !== undefined && prop.sType !== 'string') return null
          if (parentObj.propTypes === 'needsInference') return 'needsInference'
          return getTypeOfChild(parentObj.propTypes[propId], propsArray.slice(1), propsArray[0], localTypeObj, id)
        }
        if (parentObj.type === 'array') {
          if (prop.type !== 'Literal') {
            return propsArray.length === 1 ? parentObj.commonType : 'needsInference'
          }
          if (prop.sType === 'number') { // check prop is string for string in subscripts
            // let index = Number(propId)
            return getTypeOfChild(parentObj.elemTypes[propId], propsArray.slice(1), propsArray[0], localTypeObj, id)
          }
          return null // return type error : subscript value must be a number for array
        }
        return null // return on such property for strings, numbers, and bool
      }
    case 'function':
      {
        if (parentObj.type === 'array' && parentObj.isHomogeneous && propSpec.returnType === 'array') {
          propSpec.returnType = {
            'type': 'array',
            'commonType': 'needsInference',
            'isHomogeneous': false
          }
        }
        return [propSpec.paramTypes, propSpec.returnType]
      }
    default:
      return propSpec.type
  }
}

const getPathToProp = (obj, path = []) => {
  if (obj.type !== undefined && obj.type !== 'MemberExpression') {
    path.unshift(obj)
    return path
  }
  if (obj.property.type === 'Identifier' || obj.property.type === 'Literal') path.unshift(obj.property)
  // Handle binary and function calls inside member expressions
  return getPathToProp(obj.object, path)
}

const memberExprType = (expr, localTypeObj, id) => {
  let object = expr.object
  let property = expr.property
  let pathToProp = getPathToProp(object)
  pathToProp.push(property)
  let [parentId] = pathToProp
  let parentType = exprType(parentId, localTypeObj, id) // Handle cases other than object and arrays and strings
  if (parentType === null) return 'needsInference'
  if (parentType !== undefined) {
    return parentType.type === undefined ? getTypeOfChild({type: parentType}, pathToProp.slice(1), pathToProp[0], localTypeObj, id)
    : getTypeOfChild(parentType, pathToProp.slice(1), pathToProp[0], localTypeObj, id)
  }
  return null // accessing parentType undefined
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
      return memberExprType(expr, localTypeObj, id)
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
