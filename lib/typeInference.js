const typesObj = {}
const funcTypeObj = {}

const getType = (expr, expectedType) => {
  if (expr !== undefined) {
    let type = exprType(expr)
    return type === expectedType || expectedType === 'bool' ? type : null
  }
}

const checkTypes = (expr, expectedType) => {
  let typeLeft = getType(expr.left, expectedType)
  let typeRight = getType(expr.right, expectedType)
  return typeLeft === typeRight && (typeLeft === expectedType || expectedType === 'bool') ? expectedType : null
}

const selector = expr => {
  let type = expr.type
  switch (type) {
    case 'VariableDeclaration':
      declTypeExtract(expr)
      break
    default:
      return expr
  }
}

const exprType = expr => {
  let type = expr.type
  switch (type) {
    case 'Literal':
      return literalType(expr)
    case 'Identifier':
      return identifierType(expr)
    case 'BinaryExpression':
      return binaryExprType(expr)
    case 'CallExpression':
      return callExprType(expr)
    case 'ConditionalExpression':
      return conditionalExprType(expr)
    default:
      return expr
  }
}

const literalType = literal => literal.sType

const identifierType = id => typesObj[id.name]

const binaryExprType = expr => {
  let assumedType = expr.sType
  return checkTypes(expr, assumedType)
}

const conditionalExprType = expr => {
  console.log(expr)
  if (exprType(expr.test) !== 'bool') return null
  return exprType(expr.consequent) === exprType(expr.alternate) ? exprType(expr.consequent) : null
}

const callExprType = expr => expr.sType !== undefined ? expr.sType : funcTypeObj[expr.callee.name].returnType

const declTypeExtract = stmnt => {
  let [decl] = stmnt.declarations
  let [id, exp] = [decl.id, decl.init]
  let type = exprType(exp)
  typesObj[id.name] = type
  console.log(typesObj)
}

const types = body => {
  // console.log(JSON.stringify(body, null, 4))
  body.map(selector)
  return body
}

/*  Module Exports types  */
module.exports = types
