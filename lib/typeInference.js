/*
  Type inference and type checker for the AST
  IO blocks are termed as type 'IO' and whenever the type could not be inferred it is set to 'needsInference'
  globalTypesObj keeps track of all identifiers and their types, function declarations and their accepted and return types
*/
const inbuiltPropSpec = require('./inbuiltMethods').inbuiltProps
const inbuiltObjects = require('./inbuiltMethods').inbuiltObjects
const jsFunctions = require('./jsFunctions')
const isEmptyObj = require('./utilityFunctions').isEmptyObj

const globalTypesObj = {}
const funcCallTypesObj = {}

const isFunction = (id, typeObj) =>
  typeObj[id] !== undefined &&
  typeObj[id] !== null &&
  typeObj[id].type === 'function'

const getParamReturnTypes = (id, typeObj) => [
  typeObj[id.name].paramTypes,
  typeObj[id.name].returnType
]

const isEmpty = (arr) => arr.toString() === ''

const returnIdentifierType = (id, typeObj) => {
  if (isFunction(id.name, typeObj)) return getParamReturnTypes(id, typeObj)
  return typeObj[id.name]
}

const identifierType = (id, localTypeObj) => {
  if (localTypeObj[id.name] !== undefined) { return returnIdentifierType(id, localTypeObj) }
  if (globalTypesObj[id.name] !== undefined) { return returnIdentifierType(id, globalTypesObj) }
  return null
}

const literalType = (literal) => literal.sType

const unaryExprType = (expr) => {
  if (expr.operator === 'typeof') return 'string'
  if (expr.operator === '!' && exprType(expr.argument) === 'bool') return 'bool'
  if (expr.operator === '-' && exprType(expr.argument) === 'number') { return 'number' }
  return null
}

const getType = (expr, expectedType, localTypeObj, id) => {
  if (expr !== undefined) {
    const type = exprType(expr, localTypeObj, id)
    if (expr.type === 'Identifier') return type
    return type === expectedType || expectedType === 'bool'
      ? type
      : type === 'needsInference'
        ? type
        : null
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
  if (typeLeft === 'needsInference' && typeRight === 'needsInference') { return expectedType }
  return typeLeft === typeRight &&
    (typeLeft === expectedType || expectedType === 'bool')
    ? expectedType
    : null
}

const assignTypeToUninferredIdentifier = (expr, inferredType, localTypeObj) => {
  if (isEmptyObj(localTypeObj)) return localTypeObj
  const [left, right] = [expr.left.name, expr.right.name]
  if (left !== undefined && localTypeObj[left] === 'needsInference') {
    localTypeObj[left] = inferredType
  }
  if (right !== undefined && localTypeObj[right] === 'needsInference') {
    localTypeObj[right] = inferredType
  }
}

const binaryExprType = (expr, localTypeObj, id) => {
  const assumedType = expr.sType
  if (assumedType !== 'bool') { assignTypeToUninferredIdentifier(expr, assumedType, localTypeObj) }
  return checkTypes(expr, assumedType, localTypeObj, id)
}

const compareArrayProps = (array1, array2) => {
  const flag =
    array1.isHomogeneous === array2.isHomogeneous &&
    array1.commonType === array2.commonType
  return flag
    ? {
        type: 'array',
        elemTypes: {},
        commonType: array1.commonType,
        isHomogeneous: array1.isHomogeneous
      }
    : null
}

const conditionalExprType = (expr, localTypeObj, id) => {
  if (exprType(expr.test, localTypeObj, id) !== 'bool') return null
  let [consequentType, alternateType] = [
    exprType(expr.consequent, localTypeObj, id),
    exprType(expr.alternate, localTypeObj, id)
  ]
  if (
    consequentType === 'needsInference' &&
    alternateType !== 'needsInference' &&
    alternateType !== null
  ) {
    consequentType = alternateType
    localTypeObj[expr.consequent.name] = alternateType
  }
  if (
    consequentType !== 'needsInference' &&
    alternateType === 'needsInference' &&
    consequentType !== null
  ) {
    alternateType = consequentType
    localTypeObj[expr.alternate.name] = consequentType
  }
  if (consequentType === null || alternateType === null) return null
  if (consequentType.type !== undefined && alternateType.type !== undefined) {
    const match = consequentType.type === alternateType.type
    if (match) {
      return consequentType.type === 'array'
        ? compareArrayProps(consequentType, alternateType)
        : consequentType.type === 'object'
          ? { type: 'object', propTypes: {} }
          : null
    }
    return null
  }
  return consequentType === alternateType ? consequentType : null
}

// const mapArgTypeToParams = (params, args, localTypeObj, id) => {
//   return params.map((param, index) =>
//     args[index].sType === undefined
//       ? exprType(args[index], localTypeObj, id)
//       : args[index].sType
//   )
// }

const makeParamTypeArray = (localTypeObj) => {
  const paramTypes = []
  for (const identifier in localTypeObj) {
    if (localTypeObj[identifier].type === undefined) {
      paramTypes.push(localTypeObj[identifier])
    } else {
      paramTypes.push(localTypeObj[identifier].type)
    }
  }
  return paramTypes
}

const arrowFunctionExprType = (expr, localTypeObj, id) => {
  const [params, body] = [expr.params, expr.body]
  params.forEach((param) => {
    localTypeObj[param.name] = 'needsInference'
  })
  const returnType = exprType(body, localTypeObj, id)
  return returnType === null
    ? null
    : {
        type: 'function',
        paramTypes: makeParamTypeArray(localTypeObj),
        returnType
      }
}

const matchArgTypesToAcceptedTypes = (
  args,
  acceptedTypes,
  localTypeObj,
  id
) => {
  const _args = args.map((arg, index) => {
    let type = exprType(arg, localTypeObj, id)
    if (type !== null && type.type !== undefined) type = type.type
    if (
      type === 'needsInference' &&
      acceptedTypes[index] !== 'needsInference'
    ) {
      type = acceptedTypes[index]
      if (arg.type === 'Identifier') localTypeObj[arg.name] = type
    }
    return (
      type === 'needsInference' ||
      type === acceptedTypes[index] ||
      (type !== null && acceptedTypes[index] === 'needsInference')
    )
  })
  return isEmpty(_args) ? true : _args.reduce((type1, type2) => type1 === type2)
}

const checkForRecursion = (callee, id, localTypeObj, args) => {
  if (callee === id) {
    /* recursive call */
    args = args.map((e) => exprType(e, localTypeObj, id))
    if (
      globalTypesObj[id] !== undefined &&
      globalTypesObj[id].type === 'function' &&
      globalTypesObj[id].returnType !== 'needsInference'
    ) { return { flag: false } }
    args = args.map((arg) => (arg.type !== undefined ? arg.type : arg))
    globalTypesObj[id] = {
      type: 'function',
      paramTypes: args,
      returnType: 'needsInference'
    }
    return { flag: true, paramTypes: args }
  }
  return { flag: false }
}

const getFunctionType = (calleeName) => jsFunctions[calleeName]

const callExprType = (expr, localTypeObj = {}, id) => {
  const calleeName = expr.callee.name
  if (
    expr.callee.type === 'Identifier' &&
    globalTypesObj[calleeName] === undefined
  ) {
    globalTypesObj[calleeName] = getFunctionType(calleeName)
  }
  const args = expr.arguments
  // const [params, body, args] = [
  //   expr.callee.params,
  //   expr.callee.body,
  //   expr.arguments
  // ]
  // if (expr.sType !== undefined) return expr.sType // if call has type already set
  // if (
  //   params !== undefined &&
  //   body !== undefined &&
  //   (!isEmptyObj(localTypeObj) || expr.callee.id === null)
  // ) {
  //   const typesOfParams = mapArgTypeToParams(params, args, localTypeObj, id)
  //   args.map((arg) => exprType(arg, localTypeObj, id))
  //   params.map((param, index) => {
  //     localTypeObj[param.name] = typesOfParams[index]
  //     return param
  //   })
  //   return exprType(body, localTypeObj, id)
  // }
  const isRecursive = checkForRecursion(expr.callee.name, id, localTypeObj, args)
  let result = exprType(expr.callee, localTypeObj, id)
  if (result === null) return null
  if (expr.callee.id === null) result = [result.paramTypes, result.returnType]
  let [acceptedTypes, returnType] = result
  if (isRecursive.flag) acceptedTypes = isRecursive.paramTypes
  const match = matchArgTypesToAcceptedTypes(
    args,
    acceptedTypes,
    localTypeObj,
    id
  )
  returnType = match ? returnType : null
  funcCallTypesObj[calleeName] = returnType
  return returnType
}

const reduceTypes = (typesArr, localTypeObj, id) => {
  const reducedType = typesArr
    .map((e) => {
      if (e.type !== undefined && e.type === 'Identifier') {
        return { id: e.name, type: exprType(e, localTypeObj, id) }
      }
      return { id: null, type: exprType(e, localTypeObj, id) }
    })
    .reduce((exp1, exp2) => {
      if (
        exp1.type === 'needsInference' &&
        exp2.type !== 'needsInference' &&
        exp2.type !== null
      ) {
        localTypeObj[exp1.id] = exp2.type
        exp1.type = exp2.type
      }
      if (exp2.type === 'needsInference' && exp1.type !== 'needsInference') {
        exp2.type = exp1.type
        localTypeObj[exp2.id] = exp1.type
      }
      if (typeof exp1.type === 'object' && typeof exp2.type === 'object') {
        return exp1.type.type === exp2.type.type ? exp1.type : null
      }
      return exp1.type === exp2.type ? exp1 : null
    })
  return reducedType !== null ? reducedType.type : null
}

const switchStatementType = (body, localTypeObj, id) => {
  const cases = body.cases
  const initialPattern = cases[0]
  let returnType = exprType(initialPattern.consequent[0].argument, localTypeObj, id)
  const acceptedType = exprType(initialPattern.test, localTypeObj, id)
  const paramId = body.discriminant.name
  localTypeObj[paramId] = acceptedType
  const caseConseqArray = cases.map((c) => c.consequent[0].argument)
  const caseTestArray = cases.map((c) => c.test === null
    ? { type: 'Identifier', name: paramId, sType: acceptedType }
    : c.test
  )
  const conseqType = reduceTypes(caseConseqArray, localTypeObj, id)
  const testType = reduceTypes(caseTestArray, localTypeObj, id)
  if (returnType === 'needsInference') returnType = conseqType
  globalTypesObj[id] = {
    type: 'function',
    paramTypes: makeParamTypeArray(localTypeObj, id),
    returnType
  }
  return (conseqType && testType) ? returnType : null
}

const arrayExprType = (expr, localTypeObj, id) => {
  const elementTypeObj = {}
  if (isEmpty(expr.elements)) {
    return {
      type: 'array',
      elemTypes: {},
      commonType: 'needsInference',
      isHomogeneous: true
    }
  }
  const deducedtype = expr.elements
    .map((e, index) => {
      const elemType = exprType(e, localTypeObj, id)
      elementTypeObj[index] = elemType
      return elemType
    })
    .reduce((type1, type2) => (type1 === type2 ? type1 : 'needsInference'))
  const arrayType = {
    type: 'array',
    elemTypes: elementTypeObj,
    commonType:
      deducedtype.type !== undefined &&
      (deducedtype.type === 'object' || deducedtype.type === 'array')
        ? deducedtype.type
        : deducedtype,
    isHomogeneous: true
  }
  if (deducedtype === 'needsInference') {
    arrayType.isHomogeneous = false
  }
  return arrayType
}

const objectExprType = (expr, localTypeObj, id) => {
  const propertyTypeObj = {}
  expr.properties.forEach((prop) => {
    if (prop.key.value === undefined) {
      propertyTypeObj[prop.key.name] = exprType(prop.value, localTypeObj)
    } else {
      propertyTypeObj[prop.key.value] = exprType(prop.value, localTypeObj)
    }
  })
  return { type: 'object', propTypes: propertyTypeObj }
}

const getParentTypes = (propSpec, propName, parentId, localTypeObj) => {
  const supportedTypes = []
  for (const type in propSpec) {
    if (propSpec[type][propName] !== undefined) supportedTypes.push(type)
  }
  if (supportedTypes.length === 1) {
    localTypeObj[parentId.name] = supportedTypes[0]
  }
  return localTypeObj[parentId.name]
}

const getPropName = (prop) =>
  prop.type === 'Identifier'
    ? prop.name
    : prop.type === 'Literal'
      ? prop.raw
      : null

const getPropReturnType = (propSpec, propName) => {
  if (propSpec === undefined) return { type: false, id: propName } // allow
  if (propSpec.isMutative) return { type: null, id: propName } // block
  if (propSpec.isMethod) {
    return {
      type: 'function',
      paramTypes: propSpec.paramTypes,
      returnType: propSpec.returnType,
      id: propName
    }
  } // handle no params
  if (propSpec.isProp) return { type: propSpec.returnType, id: propName }
}

const checkForInbuiltProp = (parentType, prop, parentId, localTypeObj) => {
  const propName = getPropName(prop)
  if (propName === null) return { type: 'needsInference', id: propName }
  if (parentType === 'needsInference') {
    const propSpec = inbuiltPropSpec[parentType][propName]
    if (propSpec === undefined) return { type: 'needsInference', id: propName }
    localTypeObj[parentId.name] = propSpec.parentType
    return getPropReturnType(propSpec.spec, propName)
  }
  const propSpec = inbuiltPropSpec[parentType][propName]
  return getPropReturnType(propSpec, propName)
}

const getTypeOfChild = (parentObj, propsArray, parentId, localTypeObj, id) => {
  if (isEmpty(propsArray)) return parentObj
  const [prop] = propsArray
  const propSpec = checkForInbuiltProp(
    parentObj.type,
    prop,
    parentId,
    localTypeObj
  )
  const propId = propSpec.id
  switch (propSpec.type) {
    case 'needsInference': {
      const type = getParentTypes(
        inbuiltPropSpec,
        prop.name,
        parentId,
        localTypeObj
      )
      if (type === 'needsInference') return 'needsInference'
      if (typeof type === 'string') {
        localTypeObj[parentId] = type
        return getTypeOfChild(
          { type: type },
          propsArray,
          parentId,
          localTypeObj,
          id
        )
      }
      return 'needsInference'
    }
    case null:
      return null // block mutative methods
    case false: {
      if (parentObj.type === 'object') {
        if (prop.type !== 'Literal' && prop.isSubscript) {
          const expType = exprType(prop, localTypeObj, id)
          return expType !== 'string' && expType !== undefined
            ? null
            : 'needsInference'
        }
        if (prop.sType !== undefined && prop.sType !== 'string') return null
        if (parentObj.propTypes === 'needsInference') return 'needsInference'
        return getTypeOfChild(
          parentObj.propTypes[propId],
          propsArray.slice(1),
          propsArray[0],
          localTypeObj,
          id
        )
      }
      if (parentObj.type === 'array') {
        if (prop.type !== 'Literal') {
          return propsArray.length === 1
            ? parentObj.commonType
            : 'needsInference'
        }
        if (prop.sType === 'number') {
          // check prop is string for string in subscripts
          // let index = Number(propId)
          if (isEmptyObj(parentObj.elemTypes)) return parentObj.commonType
          return getTypeOfChild(
            parentObj.elemTypes[propId],
            propsArray.slice(1),
            propsArray[0],
            localTypeObj,
            id
          )
        }
        return null // return type error : subscript value must be a number for array
      }
      return null // return on such property for strings, numbers, and bool
    }
    case 'function': {
      if (
        parentObj.type === 'array' &&
        parentObj.isHomogeneous &&
        propSpec.returnType.type === 'array'
      ) {
        propSpec.returnType.isHomogeneous = propId !== 'concat'
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
  if (obj.property.type === 'Identifier' || obj.property.type === 'Literal') { path.unshift(obj.property) }
  // Handle binary and function calls inside member expressions
  return getPathToProp(obj.object, path)
}

const memberExprType = (expr, localTypeObj, id) => {
  const object = expr.object
  const property = expr.property
  const pathToProp = getPathToProp(object)
  pathToProp.push(property)
  const [parentId] = pathToProp
  const parentType = exprType(parentId, localTypeObj, id) // Handle cases other than object and arrays and strings
  if (parentType === null) return 'needsInference'
  if (parentType !== undefined) {
    return parentType.type === undefined
      ? getTypeOfChild(
          { type: parentType },
          pathToProp.slice(1),
          pathToProp[0],
          localTypeObj,
          id
        )
      : getTypeOfChild(
        parentType,
        pathToProp.slice(1),
        pathToProp[0],
        localTypeObj,
        id
      )
  }
  return null // accessing parentType undefined
}

const blockStatementType = (stmnt, localTypeObj, id) => {
  const [expr] = stmnt.body
  return exprType(expr, localTypeObj, id)
}

const exprType = (expr, localTypeObj = {}, id = null) => {
  if (expr !== null && expr.sType !== undefined && expr.sType === 'IO') { return 'IO' }
  if (expr === null) return 'needsInference'
  const type = expr.type
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

const declTypeExtract = (stmnt) => {
  const [decl] = stmnt.declarations
  const [id, exp] = [decl.id.name, decl.init]
  if ((exp.sType !== undefined && exp.sType === 'IO') || id === 'IO') {
    globalTypesObj[id] = 'IO'
  } else {
    const type = exprType(exp, {}, id)
    globalTypesObj[id] = type
  }
}
const exprTypeExtract = (stmnt) => {
  const expr = stmnt.expression
  if (expr.sType === 'IO' && !isIOCall(expr)) {
    const args = expr.arguments
    args.forEach(arg => exprType(arg))
  } else if (!isIOCall(expr)) {
    exprType(expr)
  }
}

const isIOCall = (expr) => {
  if (!expr.callee.object) return false
  const method = expr.callee.object.name
  return globalTypesObj[method] === 'IO'
}

const loadInbuiltObjects = () => {
  for (const obj in inbuiltObjects) {
    globalTypesObj[obj] = inbuiltObjects[obj]
  }
}

const delObj = (obj) => {
  for (const member in obj) {
    delete obj[member]
  }
}

const errorObj = { error: false }

const makeTypeError = (error) => {
  return `TypeError at ${error.type} '${error.id}'`
}

const checkForErrors = () => {
  for (const decl in globalTypesObj) {
    if (globalTypesObj[decl] === null) {
      errorObj.error = true
      errorObj.id = decl
      errorObj.type = 'VariableDeclaration'
      break
    }
  }
  if (errorObj.error) return
  for (const call in funcCallTypesObj) {
    if (funcCallTypesObj[call] === null) {
      errorObj.error = true
      errorObj.id = call
      errorObj.type = 'CallExpression'
      break
    }
  }
}

const types = (body) => {
  loadInbuiltObjects()
  body.forEach((expr) => {
    const type = expr.type
    if (type === 'VariableDeclaration') declTypeExtract(expr)
    else if (type === 'ExpressionStatement') exprTypeExtract(expr)
  })
  checkForErrors()
  delObj(globalTypesObj)
  delObj(funcCallTypesObj)
  return errorObj.error ? { ...errorObj, message: makeTypeError(errorObj) } : body
}

/*  Module Exports types  */
module.exports = types
