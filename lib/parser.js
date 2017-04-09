/*
  Parser
  Parses clean source. Generates clean AST.
*/
const estemplate = require('./estemplate')
const updateAst = require('./astupdate')
const parser = require('./parserObject')
const base = require('./basicParsers')
const utils = require('./utilityFunctions')
const errorMsg = require('./errors')
/* Utility Functions */
const {
  maybe,
  isEmptyObj,
  isEmptyArr,
  isNull,
  isUndefined,
  notNull,
  notUndefined,
  precedence,
  associativity
} = utils
/* Base Parsers */
const {
  returnParser, spaceParser, maybeSpace, maybeNewLineAndIndent,
  numberParser, nonReservedIdParser, identifierParser, nullParser, stringParser, booleanParser,
  openParensParser, closeParensParser,
  openCurlyBraceParser, closeCurlyBraceParser,
  openSquareBracketParser, closeSquareBracketParser,
  commaParser, colonParser, equalSignParser, thinArrowParser, dotParser,
  singleLineCommentParser, multiLineCommentParser,
  binaryOperatorParser, unaryOperatorParser,
  letParser, inParser,
  ifParser, thenParser, elseParser,
  slashParser,
  reverseBindParser, doParser, ioFuncNameParser, ioMethodNameParser,
  returnKeywordParser, deleteKeywordParser, emptyArgsParser, definePropParser
} = base

const unaryExprParser = input => parser.bind(
  parser.bind(
    unaryOperatorParser,
    operator => rest => operator === ':type'
      ? notNull(spaceParser(rest)) ? ['typeof', spaceParser(rest)[1]] : null
      : [operator, rest]),
  operator => rest => maybe(expressionParser(rest),
    (argument, rest) => [estemplate.unaryExpression(operator, argument), rest])
)(input)

/* Helper functions for binaryExprParser */
const formBinaryExpr = (opStack, operandStack, input, rest) => {
  let opStackTop = opStack[opStack.length - 1]
  if (opStackTop === '$') {
    let binExpr = operandStack.pop()
    return binExpr.type === 'BinaryExpression' ? [binExpr, input] : null // return final expression
  }
  let [right, left, op] = [operandStack.pop(), operandStack.pop(), opStack.pop()]
  let expr = estemplate.binaryExpression(left, op, right)
  return formBinaryExpr(opStack, operandStack.concat(expr), input, rest)
}

const handlePrecAssoc = (opStack, operandStack, current, rest) => {
  let opStackTop = opStack[opStack.length - 1]
  let currentHasHigher = precedence(current) > precedence(opStackTop)
  let currentHasLower = precedence(current) < precedence(opStackTop)
  let currentHasEqual = !currentHasLower && !currentHasHigher
  let isRightAssociative = currentHasEqual && associativity(current) === 'R'
  let isLeftAssociative = currentHasEqual && associativity(current) === 'L'

  if (currentHasHigher || isRightAssociative) return binaryExprParser(rest, opStack.concat(current), operandStack, 'operand')

  if (currentHasLower || isLeftAssociative) {
    let [right, left, op] = [operandStack.pop(), operandStack.pop(), opStack.pop()]
    let expr = estemplate.binaryExpression(left, op, right)
    return binaryExprParser(rest, opStack.concat(current), operandStack.concat(expr), 'operand')
  }
}

const binaryExprParser = (input, opStack = ['$'], operandStack = [], expect = 'operand') => {
  let [current, rest] = [null, null] // initialize current and rest of the string to null
  switch (expect) {
    case 'operand': {
      let maybeOperand = parser.any(fnCallParser, expressionParser)(input);
      [current, rest] = notNull(maybeOperand) ? maybeOperand : [null, null]
      return isNull(current) ? null : binaryExprParser(rest, opStack, operandStack.concat(current), 'operator')
    }
    case 'operator': {
      let maybeOperator = binaryOperatorParser(input);
      [current, rest] = notNull(maybeOperator) ? maybeOperator : [null, null]
      return notNull(current) ? handlePrecAssoc(opStack, operandStack, current, rest)
        : formBinaryExpr(opStack, operandStack, input, rest)
    }
  }
}
/* binaryExprParser ends */

const ifExprParser = input => maybe(
  parser.all(
    ifParser, valueParser,
    maybeNewLineAndIndent, thenParser, valueParser,
    maybeNewLineAndIndent, elseParser, valueParser)(input),
    (val, rest) => {
      let [, condition, , , consequent, , , alternate] = val
      return [estemplate.ifthenelse(condition, consequent, alternate), rest]
    }
)

/* Helper functions for letExpressionParser */
const letParamParser = input => parser.all(nonReservedIdParser, equalSignParser, valueParser, maybeSpace)(input)

const letParamsParser = (str, letIdArray = [], letLiteralArray = []) => {
  let param = letParamParser(str)
  if (notNull(param)) {
    let [[id,, literal], rest] = param
    return letParamsParser(rest, letIdArray.concat(id), letLiteralArray.concat(literal))
  }
  return [[letIdArray, letLiteralArray], str]
}

const letExpressionParser = input => maybe(
  parser.all(letParser, letParamsParser, inParser, valueParser)(input),
  (val, rest) => {
    let [, [letIdArray, letLiteralArray], , expr] = val
    let letExpr = estemplate.letExpression(letIdArray, letLiteralArray, expr)
    return [letExpr, rest]
  }
)

/* Helper functions for lambdaParser */
const paramsParser = (input, idArray = []) => {
  let param = parser.all(nonReservedIdParser, spaceParser)(input)
  if (isNull(param)) return [idArray, input]
  let [[val], rest] = param
  return paramsParser(rest, idArray.concat(val))
}

const lambdaParser = input => maybe(
  parser.all(slashParser, paramsParser, thinArrowParser, valueParser)(input),
  (val, rest) => {
    let [, params, , expr] = val
    return [estemplate.lambda(params, expr), rest]
  }
)

/* Helper functions for fnCallParser */
const argsParser = (input, argArray = []) => {
  let maybeArg = expressionParser(input)
  if (isNull(maybeArg)) return isEmptyArr(argArray) ? null : [argArray, input]
  let [arg, rest] = maybeArg
  argArray = argArray.concat(arg)
  let result = spaceParser(rest)
  if (isNull(result)) return [argArray, rest]
  let [, _res] = result
  return argsParser(_res, argArray)
}

const calleeParser = input => parser.any(memberExprParser, nonReservedIdParser)(input)

const fnArgsParser = input => parser.any(emptyArgsParser, argsParser)(input)

const fnCallParser = input => maybe(
  parser.all(calleeParser, spaceParser, fnArgsParser)(input),
  (val, rest) => {
    let [callee, , args] = val
    let callExpr = estemplate.fnCall(callee, args)
    let expr = rest.str.startsWith('\n') || /^()()$/.test(rest.str) ? estemplate.expression(callExpr) : callExpr
    return [expr, rest]
  }
)

/* Helper functions for lambdaCallParser */
const lambdaArgsParser = (input, lambdaArgsArray = []) => {
  let arg = parser.all(spaceParser, valueParser)(input)
  if (notNull(arg)) {
    let [[, val], rest] = arg
    return lambdaArgsParser(rest, lambdaArgsArray.concat(val))
  }
  return [lambdaArgsArray, input]
}

const lambdaCallParser = input => {
  let result = parser.all(openParensParser, lambdaParser, closeParensParser, lambdaArgsParser)(input)
  if (isNull(result)) return null
  let [[, lambdaAst, , argsArr], rest] = result
  let {params, body} = lambdaAst.expression
  let val = estemplate.lambdaCall(params, argsArr, body)
  return [val, rest]
}

/* Parsers for structures */

/* Helper functions for structure parsers */
const commaCheck = (input, propArr) => {
  let [, rest] = maybeSpace(input)
  let comma = commaParser(rest)
  if (notNull(comma)) {
    propArr.push(null)
    let [, rest] = comma
    return arrayElemsParser(rest, propArr)
  }
  return [propArr, rest]
}

/* Helper functions for arrayParser */
const arrayElemParser = input => maybe(
  parser.all(maybeNewLineAndIndent, valueParser, maybeSpace)(input),
  (val, rest) => {
    let [, value] = val
    return [value, rest]
  }
)

const arrayElemsParser = (input, propArr = []) => {
  let result = arrayElemParser(input)
  if (isNull(result)) return commaCheck(input, propArr)
  let [val, rest] = result
  propArr.push(val)
  let comma = commaParser(rest)
  if (isNull(comma)) return [propArr, rest]
  let [, _rest] = comma
  return arrayElemsParser(_rest, propArr)
}

const arrayParser = input => {
  let openSquareBracket = openSquareBracketParser(input)
  if (isNull(openSquareBracket)) return null
  let [, rest] = openSquareBracket
  let result = arrayElemsParser(rest)
  let [arrayPropAst, arrayPropsRest] = result
  let closeSquareBracket = parser.all(maybeNewLineAndIndent, closeSquareBracketParser)(arrayPropsRest)
  if (isNull(closeSquareBracket)) { return null }
  [, rest] = closeSquareBracket
  return [estemplate.array(arrayPropAst), rest]
}

/* Helper functions for objectParser */
const keyParser = input => parser.any(identifierParser, stringParser, numberParser)(input)

const objectPropParser = input => maybe(
  parser.all(maybeNewLineAndIndent, keyParser,
             maybeSpace, colonParser,
             maybeSpace, valueParser, maybeSpace)(input),
  (val, rest) => {
    let [ , key, , , , value, , ] = val
    return [estemplate.objectProperty(key, value), rest]
  }
)

const objectPropsParser = (input, propArr = []) => {
  let result = objectPropParser(input)
  if (isNull(result)) return [propArr, input]
  let [val, rest] = result
  propArr.push(val)
  let commaResult = commaParser(rest)
  if (isNull(commaResult)) { return [propArr, rest] }
  [, rest] = commaResult
  let closeCurlyBrace = closeCurlyBraceParser(rest)
  if (notNull(closeCurlyBrace)) return null
  return objectPropsParser(rest, propArr)
}

const objectParser = input => {
  let openCurlyResult = openCurlyBraceParser(input)
  if (isNull(openCurlyResult)) return null
  let [, rest] = openCurlyResult
  let result = objectPropsParser(rest)
  if (isNull(result)) return null
  let [objPropArray, objPropsRest] = result
  let closeCurlyResult = parser.all(maybeSpace, maybeNewLineAndIndent, closeCurlyBraceParser)(objPropsRest)
  if (isNull(closeCurlyResult)) { return null }
  [, rest] = closeCurlyResult
  return [estemplate.object(objPropArray), rest]
}
/* end of structure parsers */

/* Helper functions for memberExprParser */
const formMemberExpression = (input, obj) => {
  let prop = parser.any(dotParser, subscriptParser, identifierParser)(input)
  if (isNull(prop)) return [obj, input]
  let [exp, rest] = prop
  if (exp.isSubscript) return formMemberExpression(rest, estemplate.subscriptExpression(obj, exp))
  exp.isSubscript = false
  if (exp.type === 'Identifier') return formMemberExpression(rest, estemplate.memberExpression(obj, exp))
  return formMemberExpression(rest, obj)
}

const subscriptParser = input => {
  let result = parser.all(openSquareBracketParser,
                          parser.any(memberExprParser, nonReservedIdParser,
                                     numberParser, stringParser),
                          closeSquareBracketParser)(input)
  if (notNull(result)) {
    let [[, prop], rest] = result
    prop.isSubscript = true
    return [prop, rest]
  }
  return null
}

const memberExprParser = input => {
  let parentObj = parser.any(arrayParser, nonReservedIdParser, parenthesesParser)(input)
  if (isNull(parentObj)) return null
  let [obj, rest] = parentObj
  let result = formMemberExpression(rest, obj)
  let [memExpr, _rest] = result
  memExpr = memExpr.type === 'ExpressionStatement' ? memExpr.expression : memExpr
  return memExpr.type === 'MemberExpression' ? [memExpr, _rest] : null
}

const defineStmtParser = input => maybe(
  parser.all(definePropParser, spaceParser,
             parser.any(memberExprParser, nonReservedIdParser), spaceParser,
             stringParser, spaceParser, valueParser)(input),
  (val, rest) => {
    let [, , objID, , key, , value] = val
    let definePropStmt = estemplate.defineProp(objID, key, value, false)
    return [definePropStmt, rest]
  }
)

/* IO parsers */

const ioFuncName = input => parser.all(ioFuncNameParser, spaceParser, argsParser)(input)

const doBlockParser = input => {
  let result = parser.all(doParser, ioBodyParser)(input)
  if (isNull(result)) return null
  let [[, doBlock], rest] = result
  return [estemplate.expression(doBlock), rest]
}

const doFuncParser = input => {
  let result = parser.all(nonReservedIdParser, funcParamsParser, equalSignParser, doBlockParser)(input)
  if (isNull(result)) return null
  let [[funcId, params, , funcBody], rest] = result
  funcBody = notUndefined(funcBody.expression) && funcBody.expression.type === 'ArrowFunctionExpression' ? funcBody.expression.body : funcBody
  funcBody.sType = 'IO'
  let val = estemplate.funcDeclaration(funcId, params, funcBody)
  return [val, rest]
}

const ioStmtParser = (input, parentObj) => {
  let result = ioFuncName(input)
  if (isNull(result)) return null
  let [[id, , args], rest] = result
  if (isEmptyObj(parentObj)) {
    let val = estemplate.ioCall(id, args)
    val.sType = 'IO'
    return [val, rest]
  }
  let val = estemplate.ioStmt(id, parentObj, args, parentObj.nextParams)
  return [val, rest]
}

const noArgsCallParser = input => {
  let result = parser.all(parser.any(memberExprParser,
                                     parenthesesParser,
                                     nonReservedIdParser),
                          spaceParser, openParensParser, closeParensParser)(input)
  if (isNull(result)) return null
  let [[callee], rest] = result
  return [estemplate.fnCall(callee, []), rest]
}

/* Helper functions for bindStatementParser */
const bindIDParser = input => {
  let result = paramsParser(input)
  return isEmptyArr(result[0]) ? null : result
}

const maybeBindStmt = input => (parser.all(bindIDParser, reverseBindParser, parser.any(fnCallParser, ioFuncName, nonReservedIdParser))(input))

const mapIOCall = (ioFunc, args, nextParams) => estemplate.ioMap(estemplate.ioCall(ioFunc, args, nextParams),
                                                                 estemplate.lambda(nextParams,
                                                                                   estemplate.array(nextParams)),
                                                                 nextParams)

const isIOorFuncCall = maybeIOFunc => {
  let isFuncCall = notUndefined(maybeIOFunc.type, maybeIOFunc.expression) && maybeIOFunc.expression.type === 'CallExpression'
  let isIOCall = notUndefined(maybeIOFunc.type) && maybeIOFunc.type === 'Identifier'
  return [isFuncCall, isIOCall]
}

const createIOBody = (args, ioFunc) => {
  let [func] = args
  let cb = estemplate.identifier('cb')
  ioFunc.name = 'createIO'
  func.arguments = func.arguments.concat(cb)
  return [estemplate.lambda([cb], func)]
}

const makeBind = (isIOorFunc, isIOCall, maybeIOFunc, ioFunc, args, nextParams) => {
  let cbBody = isIOorFunc ? maybeIOFunc : estemplate.ioCall(ioFunc, args, nextParams)
  cbBody.nextParams = isIOCall ? nextParams : cbBody.nextParams
  return cbBody
}

const formBindStmt = (cbBody, parentObj, nextParams, rest, bindBody) => {
  let cbParams = parentObj.nextParams
  let callBack = estemplate.lambda(cbParams, cbBody)
  return ioBodyParser(rest, estemplate.ioBind(parentObj, callBack, nextParams), bindBody)
}

const bindStmt = (maybeBind, parentObj, bindBody) => {
  let [[bindID, , maybeIOFunc], rest] = maybeBind
  let nextParams = isUndefined(parentObj.nextParams) ? bindID : parentObj.nextParams.concat(bindID)
  let [isFuncCall, isIOCall] = isIOorFuncCall(maybeIOFunc)
  let isIOorFunc = isFuncCall || isIOCall
  if (isIOCall) maybeIOFunc = estemplate.fnCall(maybeIOFunc, [])
  let [ioFunc, , args] = isIOorFunc ? [null, null, null] : maybeIOFunc
  let isNewIO = notNull(ioFunc) && ioFunc.name === 'IO' && args[0].type === 'CallExpression'
  if (isNewIO) args = createIOBody(args, ioFunc)

  if (isEmptyObj(parentObj)) {
    let val = isIOorFunc ? maybeIOFunc : mapIOCall(ioFunc, args, nextParams)
    if (isFuncCall) val = val.expression
    val.nextParams = isIOorFunc ? nextParams : val.nextParams
    return ioBodyParser(rest, val, bindBody)
  }
  let cbBody = makeBind(isIOorFunc, isIOCall, maybeIOFunc, ioFunc, args, nextParams)
  return formBindStmt(cbBody, parentObj, nextParams, rest, bindBody)
}

/* letStmtParser in IO */
const maybeLetStmt = (input, parentObj, bindBody) => maybe(
  parser.all(letParser, letParamsParser)(input),
  (val, rest) => {
    let [, [idArray, valArray]] = val
    let mapChain = makeMapChain(idArray, valArray, parentObj)
    return ioBodyParser(rest, mapChain, bindBody)
  }
)

const makeMapChain = (idArray, valArray, parentObj) => {
  if (idArray.length === 0 && valArray.length === 0) return parentObj
  let cbParams = parentObj.nextParams
  let cbBody = estemplate.array([valArray[0]].concat(cbParams))
  let nextParams = [idArray[0]].concat(cbParams)
  let callBack = estemplate.lambda(cbParams, cbBody)
  let nextParent = estemplate.ioMap(parentObj, callBack, nextParams)
  return makeMapChain(idArray.slice(1), valArray.slice(1), nextParent)
}
/* letStmtParser ends here */

/* maybe<Val> parser */
const handlerParser = input => {
  let result = parser.all(openParensParser,
                          parser.any(fnCallParser, ioFuncName, lambdaCallParser),
                          closeParensParser)(input)
  if (isNull(result)) return null
  let [[, val], rest] = result
  return [val, rest]
}

const maybeStmtParser = (input, parentObj, bindBody) => maybe(
  parser.all(ioMethodNameParser, spaceParser, expressionParser, spaceParser, handlerParser)(input),
  (val, rest) => maybeStmt(val, rest, parentObj, bindBody)
)

const maybeStmt = (maybeVal, rest, parentObj, bindBody) => {
  let [methodName, , value, , handler] = maybeVal
  let nextParams = parentObj.nextParams
  let handlerBody = handler
  if (Array.isArray(handler)) {
    let [ioFunc, , args] = handler
    handler = ioFunc
    handlerBody = estemplate.defaultIOThen(estemplate.ioCall(handler, args))
  }
  let handler_ = estemplate.lambda(nextParams, handlerBody)
  let maybeValue = estemplate.lambda(nextParams, value)
  let val = estemplate.ioMayBe(parentObj, methodName, [maybeValue, handler_], nextParams)
  return ioBodyParser(rest, val, bindBody)
}
/* maybe<val> parser ends here */

/* Handler function for delete and defineProp */
const makeMap = (stmt, rest, parentObj, bindBody) => {
  let nextParams = parentObj.nextParams
  let returnVal = estemplate.returnStmt(nextParams)
  let cbBody = estemplate.blockStmt([stmt, returnVal])
  let callBack = estemplate.lambda(nextParams, cbBody)
  let val = estemplate.ioMap(parentObj, callBack, nextParams)
  return ioBodyParser(rest, val, bindBody)
}

/* defineProp and delete parsers */
const maybeDefineStmt = (input, parentObj, bindBody) => maybe(
  parser.all(definePropParser, spaceParser,
             parser.any(memberExprParser, nonReservedIdParser), spaceParser,
             stringParser, spaceParser, valueParser)(input),
  (val, rest) => {
    let [, , objID, , key, , value] = val
    let definePropTmpl = estemplate.defineProp(objID, key, value, true)
    return makeMap(definePropTmpl, rest, parentObj, bindBody)
  }
)

const maybeDeleteStmt = (input, parentObj, bindBody) => maybe(
  parser.all(deleteKeywordParser, spaceParser, parser.any(memberExprParser, nonReservedIdParser))(input),
  (val, rest) => {
    let [deleteKeyword, , objProp] = val
    let deleteTmpl = estemplate.unaryExpression(deleteKeyword, objProp)
    return makeMap(deleteTmpl, rest, parentObj, bindBody)
  }
)
/* defineProp and delete ends here */

/* make final statement */
const getCbBody = (bindBody, parentObj) => {
  if (bindBody.length === 0) {
    if (parentObj.type === 'Identifier') return estemplate.fnCall(parentObj, [])
    return parentObj
  }
  let callBack = estemplate.lambda(parentObj.nextParams, estemplate.fnCall(bindBody[0], []))
  let val = estemplate.ioBind(parentObj, callBack, parentObj.nextParams)
  val.nextParams = parentObj.nextParams
  return getCbBody(bindBody.slice(1), val)
}

const makeFinalStmt = (input, rest, parentObj, bindBody) => {
  if (isEmptyObj(parentObj) && bindBody.length === 0) return null
  if (isEmptyObj(parentObj) && bindBody.length !== 0) {
    parentObj = getCbBody(bindBody.slice(1), bindBody[0])
    let val = estemplate.defaultIOThen(parentObj)
    return [val, rest]
  }

  let cbParams = isUndefined(parentObj.nextParams) ? [] : parentObj.nextParams
  parentObj = getCbBody(bindBody, parentObj)
  let cbBody = isUndefined(parentObj.returnVals) ? estemplate.array(bindBody) : estemplate.array(parentObj.returnVals)
  let callBack = estemplate.lambda(cbParams, cbBody)
  let val
  if (isUndefined(parentObj.returnVals)) {
    val = estemplate.ioThen(parentObj, callBack, cbParams)
  } else {
    val = estemplate.lambda([], estemplate.ioMap(parentObj, callBack, cbParams)).expression // need .expression here
  }
  val.sType = 'IO'
  return [val, rest]
}
/* final statement ends here */

const maybeFinalStmt = (finalStmt, input, parentObj, bindBody) => {
  let [, rest] = finalStmt
  let result = spaceParser(rest)
  if (isNull(result)) {
    return makeFinalStmt(input, rest, parentObj, bindBody)
  }
  [, rest] = result
  let maybeReturn = parser.all(returnKeywordParser, spaceParser, argsParser)(rest)
  if (notNull(maybeReturn)) [[, , parentObj.returnVals], rest] = maybeReturn
  return ioBodyParser(rest, parentObj, bindBody)
}

const maybeFuncCallStmt = (input, parentObj, bindBody) => maybe(
  fnCallParser(input),
  (fnCall, rest) => {
    let nextParams = parentObj.nextParams
    let val = estemplate.ioMap(parentObj,
                               estemplate.lambda(nextParams, estemplate.blockStmt([fnCall, estemplate.returnStmt(nextParams)])),
                               nextParams)
    return ioBodyParser(rest, val, bindBody)
  }
)

const maybeIOCallStmt = (maybeIOCall, parentObj, bindBody) => {
  let [ioID, rest] = maybeIOCall
  if (isEmptyObj(parentObj)) ioID.nextParams = []
  let val = ioID
  return ioBodyParser(rest, parentObj, bindBody.concat(val))
}

const ioBodyParser = (input, parentObj = {}, bindBody = []) => {
  let finalStmt = returnParser(input)
  if (notNull(finalStmt)) return maybeFinalStmt(finalStmt, input, parentObj, bindBody)

  let bind = maybeBindStmt(input)
  if (notNull(bind)) return bindStmt(bind, parentObj, bindBody)

  if (!isEmptyObj(parentObj)) {
    let val = parser.any(maybeDefineStmt, maybeDeleteStmt, maybeLetStmt, maybeStmtParser, maybeFuncCallStmt)(input, parentObj, bindBody)
    if (val !== null) return val
  }

  let ioStmt = ioStmtParser(input, parentObj)
  if (notNull(ioStmt)) return ioBodyParser(ioStmt[1], ioStmt[0], bindBody)

  let ioCall = nonReservedIdParser(input)
  if (notNull(ioCall)) return maybeIOCallStmt(ioCall, parentObj, bindBody)

  return null
}

const ioDecl = (isId, maybeDo, doID, input, rest) => {
  let ioBody
  if (maybeDo === 'do') {
    let result = ioBodyParser(rest)
    if (isNull(result)) { return null }
    [ioBody, rest] = result
    ioBody.expression = false
  } else {
    maybeDo = isId ? estemplate.fnCall(maybeDo, []) : maybeDo
    ioBody = estemplate.defaultIOThen(maybeDo)
  }
  ioBody.sType = 'IO'
  let val = estemplate.declaration(doID, ioBody)
  return [val, rest]
}

const ioParser = input => {
  let initIO = parser.all(nonReservedIdParser, equalSignParser,
                          parser.any(doParser, noArgsCallParser,
                                     ioStmtParser, nonReservedIdParser)
                         )(input)
  if (isNull(initIO)) return null
  let [[doID, , maybeDo], rest] = initIO
  let isId = notUndefined(maybeDo.type) && maybeDo.type === 'Identifier'
  let idNotMain = isId && doID.name !== 'main'
  if (idNotMain) return null
  let isFunc = notUndefined(maybeDo.type) && maybeDo.type === 'CallExpression'
  let funcNotMain = isFunc && doID.name !== 'main'
  if (funcNotMain) {
    let val = maybeDo
    val.sType = 'IO'
    return [estemplate.declaration(doID, val), rest]
  }
  return ioDecl(isId, maybeDo, doID, input, rest)
}
/* IO ends here */

const expressionParser = input => parser.any(parenthesesParser, unaryExprParser, lambdaParser, lambdaCallParser,
                                             letExpressionParser, ifExprParser, memberExprParser, arrayParser,
                                             objectParser, booleanParser, nonReservedIdParser, numberParser,
                                             nullParser, stringParser)(input)

const parenthesesParser = input => {
  let result = parser.all(openParensParser, maybeNewLineAndIndent,
                          valueParser, maybeNewLineAndIndent, closeParensParser)(input)
  if (isNull(result)) return null
  let [[, , val], rest] = result
  return [val, rest]
}

const valueParser = input => parser.any(binaryExprParser, fnCallParser, expressionParser)(input)

const declParser = input => maybe(
  parser.all(nonReservedIdParser, equalSignParser, valueParser)(input),
  (val, rest) => {
    let [id, , value] = val
    return [estemplate.declaration(id, value), rest]
  }
)

/* Helper for fnDeclParser */
const funcParamsParser = (input, paramArray = []) => {
  let param = parser.all(spaceParser, parser.any(arrayParser, objectParser, nonReservedIdParser, numberParser, nullParser, stringParser))(input)
  if (notNull(param)) {
    let [[, val], rest] = param
    return funcParamsParser(rest, paramArray.concat(val))
  }
  return [paramArray, input]
}

const fnDeclParser = input => maybe(
  parser.all(nonReservedIdParser, funcParamsParser, equalSignParser, valueParser)(input),
  (val, rest) => {
    let [funcID, paramsArr, , body] = val
    return [estemplate.funcDeclaration(funcID, paramsArr, body), rest]
  }
)

const statementParser = input => parser.any(multiLineCommentParser, singleLineCommentParser,
                                            returnParser, doBlockParser, ioParser,
                                            doFuncParser, declParser, ifExprParser,
                                            fnDeclParser, defineStmtParser, fnCallParser, lambdaParser,
                                            lambdaCallParser, spaceParser)(input)

const makeErrorObj = errObj => {
  errObj.error = true
  const len = errObj.regex.length - 1
  const defaultMsg = errorMsg.default + ': ' + errObj.str
  const regexName = isUndefined(errObj.regex[len]) ? defaultMsg : errObj.regex[len]
  const errorText = isUndefined(errorMsg[regexName]) ? defaultMsg : errorMsg[regexName]
  errObj.msg = errorText
  delete errObj.regex
  return errObj
}

const programParser = (input, ast = estemplate.ast()) => {
  let [, rest] = ['', input]
  let result = statementParser(rest)
  if (isNull(result)) {
    let errObj = JSON.parse(JSON.stringify(parser.unParsed))
    parser.unParsed = {'line': 1, 'column': 0, 'regex': [], 'error': false}
    if (input.str === '') return updateAst(ast)
    return makeErrorObj(errObj)
  }
  if (typeof result[0] !== 'string') ast.body.push(result[0])
  return programParser(result[1], ast)
}
/*  Module Exports programParser  */
module.exports = {
  programParser,
  doBlockParser,
  ioParser,
  doFuncParser,
  declParser,
  ifExprParser,
  fnDeclParser,
  defineStmtParser,
  fnCallParser,
  lambdaParser,
  lambdaCallParser
}
