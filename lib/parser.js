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
  numberParser, nonReservedIdParser, identifierParser, domMethodParser, nullParser, stringParser, booleanParser,
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

const letParamsParser = (str, letIdArray = [], letLiteralArray = []) => maybe(
  letParamParser(str),
  (val, rest) => {
    let [id,, literal] = val
    return letParamsParser(rest, letIdArray.concat(id), letLiteralArray.concat(literal))
  }) || [[letIdArray, letLiteralArray], str]

const letExpressionParser = input => maybe(
  parser.all(letParser, letParamsParser, inParser, valueParser)(input),
  (val, rest) => {
    let [, [letIdArray, letLiteralArray], , expr] = val
    let letExpr = estemplate.letExpression(letIdArray, letLiteralArray, expr)
    return [letExpr, rest]
  }
)

/* Helper functions for lambdaParser */
const paramsParser = (input, idArray = []) => maybe(
  parser.all(nonReservedIdParser, spaceParser)(input),
  (val, rest) => {
    let [val_] = val
    return paramsParser(rest, idArray.concat(val_))
  }
) || [idArray, input]

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
const lambdaArgsParser = (input, lambdaArgsArray = []) => maybe(
  parser.all(spaceParser, valueParser)(input),
  (val, rest) => {
    let [, arg] = val
    return lambdaArgsParser(rest, lambdaArgsArray.concat(arg))
  }
) || [lambdaArgsArray, input]

const lambdaCallParser = input => maybe(
  parser.all(openParensParser, lambdaParser, closeParensParser, lambdaArgsParser)(input),
  (val, rest) => {
    let [, lambdaAst, , argsArr] = val
    let {params, body} = lambdaAst.expression
    let val_ = estemplate.lambdaCall(params, argsArr, body)
    return [val_, rest]
  }
)

/* Parsers for structures */

/* Helper functions for structure parsers */
const commaCheck = (input, propArr) => maybe(
  parser.all(maybeSpace, commaParser)(input),
  (val, rest) => {
    propArr.push(null)
    return arrayElemsParser(rest, propArr)
  }) || [propArr, input]

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

const subscriptParser = input => maybe(
  parser.all(openSquareBracketParser, parser.any(memberExprParser, nonReservedIdParser, numberParser, stringParser),
             closeSquareBracketParser)(input),
  (val, rest) => {
    let [, prop] = val
    prop.isSubscript = true
    return [prop, rest]
  }
)

const memberExprParser = input => maybe(
  parser.any(arrayParser, nonReservedIdParser, parenthesesParser)(input),
  (val, rest) => {
    let obj = val
    let result = formMemberExpression(rest, obj)
    let [memExpr, _rest] = result
    memExpr = memExpr.type === 'ExpressionStatement' ? memExpr.expression : memExpr
    return memExpr.type === 'MemberExpression' ? [memExpr, _rest] : null
  }
)

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

const parensDOMStmt = input => maybe(
  parser.all(openParensParser, maybeDOMStmt, closeParensParser)(input),
  (val, rest) => {
    let [, expr] = val
    return [expr, rest]
  }
)

const ioFuncName = input => parser.all(ioFuncNameParser, spaceParser, parser.any(parensDOMStmt, argsParser))(input)

const doBlockParser = input => maybe(
  parser.all(doParser, ioBodyParser)(input),
  (val, rest) => {
    let [, doBlock] = val
    return [estemplate.expression(doBlock), rest]
  }
)

const doFuncParser = input => maybe(
  parser.all(nonReservedIdParser, funcParamsParser, equalSignParser, doBlockParser)(input),
  (val, rest) => {
    let [funcId, params, , funcBody] = val
    funcBody = notUndefined(funcBody.expression) && funcBody.expression.type === 'ArrowFunctionExpression' ? funcBody.expression.body : funcBody
    funcBody.sType = 'IO'
    let val_ = estemplate.funcDeclaration(funcId, params, funcBody)
    return [val_, rest]
  }
)

const ioStmtParser = (input, parentObj, mapBody = {stmts: [], propagate: []}) => maybe(
  ioFuncName(input),
  (val, rest) => {
    let [id, , args] = val
    if (isEmptyObj(parentObj)) {
      let val_ = estemplate.ioCall(id, args)
      val_.sType = 'IO'
      return [val_, rest]
    }
    if (!isEmptyArr(mapBody.stmts)) parentObj = makeMap(parentObj, mapBody)
    let val_ = estemplate.ioStmt(id, parentObj, args, parentObj.nextParams)
    return [val_, rest]
  }
)

const noArgsCallParser = input => maybe(
  parser.all(parser.any(memberExprParser, parenthesesParser, nonReservedIdParser), spaceParser, openParensParser, closeParensParser)(input),
  (val, rest) => {
    let [callee] = val
    return [estemplate.fnCall(callee, []), rest]
  }
)

/* Helper functions for bindStatementParser */
const bindIDParser = input => {
  let result = paramsParser(input)
  return isEmptyArr(result[0]) ? null : result
}

const maybeDOMStmt = input => maybe(
  parser.all(domMethodParser, spaceParser, argsParser)(input),
  (val, rest) => {
    let [domFunc, , args] = val
    let callExpr = estemplate.expression(estemplate.fnCall(domFunc, args))
    let expr = rest.str.startsWith('\n') || /^()()$/.test(rest.str) ? estemplate.expression(callExpr) : callExpr
    return [expr, rest]
  }
)

const maybeBindStmt = input => (parser.all(bindIDParser, reverseBindParser, parser.any(fnCallParser, maybeDOMStmt, ioFuncName, nonReservedIdParser))(input))

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

const formBindStmt = (cbBody, parentObj, nextParams, rest, bindBody, mapBody) => {
  let cbParams = parentObj.nextParams.concat(mapBody.propagate)
  let callBack = estemplate.lambda(cbParams, cbBody)
  return isEmptyArr(mapBody.stmts)
    ? ioBodyParser(rest, estemplate.ioBind(parentObj, callBack, nextParams), bindBody, mapBody)
    : ioBodyParser(rest, estemplate.ioBind(makeMap(parentObj, mapBody), callBack, nextParams), bindBody)
}

const bindStmt = (maybeBind, parentObj, bindBody, mapBody) => {
  let [[bindID, , maybeIOFunc], rest] = maybeBind
  let nextParams = isUndefined(parentObj.nextParams)
        ? bindID
        : isEmptyArr(mapBody.stmts)
        ? parentObj.nextParams.concat(bindID)
        : mapBody.propagate.concat(bindID)

  let [isFuncCall, isIOCall] = isIOorFuncCall(maybeIOFunc)
  let isIOorFunc = isFuncCall || isIOCall
  if (isIOCall) maybeIOFunc = estemplate.fnCall(maybeIOFunc, [])
  let [ioFunc, , args] = isIOorFunc ? [null, null, null] : maybeIOFunc
  args = Array.isArray(args) ? args : [args]
  let isNewIO = notNull(ioFunc) && ioFunc.name === 'IO' && args[0].type === 'CallExpression'
  if (isNewIO) args = createIOBody(args, ioFunc)

  if (isEmptyObj(parentObj)) {
    let val = isIOorFunc ? maybeIOFunc : mapIOCall(ioFunc, args, nextParams)
    if (isFuncCall) val = val.expression
    val.nextParams = isIOorFunc ? nextParams : val.nextParams
    return ioBodyParser(rest, val, bindBody, mapBody)
  }
  if (!isEmptyArr(mapBody.stmts)) nextParams = parentObj.nextParams.concat(nextParams)
  let cbBody = makeBind(isIOorFunc, isIOCall, maybeIOFunc, ioFunc, args, nextParams)
  return formBindStmt(cbBody, parentObj, nextParams, rest, bindBody, mapBody)
}

/* letStmtParser in IO */
const letParamIOParser = input => parser.all(nonReservedIdParser, equalSignParser, parser.any(maybeDOMStmt, valueParser), maybeSpace)(input)

const letParamsIOParser = (str, letStmtsArray = [], nextParams = []) => maybe(
  letParamIOParser(str),
  (val, rest) => {
    let [id, , literal] = val
    return letParamsIOParser(rest, letStmtsArray.concat(estemplate.letDecl(id, literal)), nextParams.concat(id))
  }
) || [[letStmtsArray, nextParams], str]

const maybeLetStmt = (input, parentObj, bindBody, mapBody) => maybe(
  parser.all(letParser, letParamsIOParser)(input),
  (val, rest) => {
    let [, [letDeclarations, propagatedVals]] = val
    mapBody.stmts = mapBody.stmts.concat(letDeclarations)
    mapBody.propagate = !isEmptyArr(mapBody.propagate) && (mapBody.propagate[0].name === propagatedVals[0].name)
      ? mapBody.propagate.concat(propagatedVals.slice(1))
      : mapBody.propagate.concat(propagatedVals)
    return ioBodyParser(rest, parentObj, bindBody, mapBody)
  }
)

/* letStmtParser ends here */

/* maybe<Val> parser */
const handlerParser = input => maybe(
  parser.all(openParensParser,
             parser.any(fnCallParser, ioFuncName, lambdaCallParser),
             closeParensParser)(input),
  (val, rest) => {
    let [, val_] = val
    return [val_, rest]
  }
)

const maybeStmtParser = (input, parentObj, bindBody, mapBody) => maybe(
  parser.all(ioMethodNameParser, spaceParser, expressionParser, spaceParser, handlerParser)(input),
  (val, rest) => maybeStmt(val, rest, parentObj, bindBody, mapBody)
)

const maybeStmt = (maybeVal, rest, parentObj, bindBody, mapBody) => {
  let [methodName, , value, , handler] = maybeVal
  if (!isEmptyArr(mapBody.stmts)) parentObj = makeMap(parentObj, mapBody)
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
const makeMap = (parentObj, mapBody) => {
  let nextParams = parentObj.nextParams
  let returnVal = estemplate.returnStmt(nextParams.concat(mapBody.propagate))
  let cbBody = estemplate.blockStmt(mapBody.stmts.concat(returnVal))
  let callBack = estemplate.lambda(nextParams, cbBody)
  let val = estemplate.ioMap(parentObj, callBack, nextParams)
  val.nextParams = nextParams.concat(mapBody.propagate)
  return val
}

/* defineProp and delete parsers */
const maybeDefineStmt = (input, parentObj, bindBody, mapBody) => maybe(
  parser.all(definePropParser, spaceParser,
             parser.any(memberExprParser, nonReservedIdParser), spaceParser,
             stringParser, spaceParser, valueParser)(input),
  (val, rest) => {
    let [, , objID, , key, , value] = val
    let definePropTmpl = estemplate.defineProp(objID, key, value, true)
    mapBody.stmts = mapBody.stmts.concat(definePropTmpl)
    return ioBodyParser(rest, parentObj, bindBody, mapBody)
  }
)

const maybeDeleteStmt = (input, parentObj, bindBody, mapBody) => maybe(
  parser.all(deleteKeywordParser, spaceParser, parser.any(memberExprParser, nonReservedIdParser))(input),
  (val, rest) => {
    let [deleteKeyword, , objProp] = val
    let deleteTmpl = estemplate.unaryExpression(deleteKeyword, objProp)
    mapBody.stmts = mapBody.stmts.concat(deleteTmpl)
    return ioBodyParser(rest, parentObj, bindBody, mapBody)
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

const makeFinalStmt = (input, rest, parentObj, bindBody, mapBody) => {
  if (isEmptyObj(parentObj) && bindBody.length === 0) return null
  if (isEmptyObj(parentObj) && bindBody.length !== 0) {
    parentObj = getCbBody(bindBody.slice(1), bindBody[0])
    let val = estemplate.defaultIOThen(parentObj)
    return [val, rest]
  }
  if (!isEmptyArr(mapBody.stmts)) parentObj = makeMap(parentObj, mapBody)
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

const maybeFinalStmt = (finalStmt, input, parentObj, bindBody, mapBody) => {
  let [, rest] = finalStmt
  let result = spaceParser(rest)
  if (isNull(result)) {
    return makeFinalStmt(input, rest, parentObj, bindBody, mapBody)
  }
  [, rest] = result
  let maybeReturn = parser.all(returnKeywordParser, spaceParser, argsParser)(rest)
  let mapIsNotEmpty = !isEmptyArr(mapBody.stmts)
  parentObj = mapIsNotEmpty && notNull(maybeReturn) ? makeMap(parentObj, mapBody) : parentObj
  mapBody = mapIsNotEmpty && notNull(maybeReturn) ? {stmts: [], propagate: []} : mapBody
  if (notNull(maybeReturn)) {
    [[, , parentObj.returnVals], rest] = maybeReturn
  }
  return ioBodyParser(rest, parentObj, bindBody, mapBody)
}

const maybeFuncCallStmt = (input, parentObj, bindBody, mapBody) => maybe(
  fnCallParser(input),
  (fnCall, rest) => {
    mapBody.stmts = mapBody.stmts.concat(fnCall)
    return ioBodyParser(rest, parentObj, bindBody, mapBody)
  }
)

const maybeIOCallStmt = (maybeIOCall, parentObj, bindBody, mapBody) => {
  let [ioID, rest] = maybeIOCall
  if (isEmptyObj(parentObj)) ioID.nextParams = []
  let val = ioID
  return isEmptyArr(mapBody.stmts)
    ? ioBodyParser(rest, parentObj, bindBody.concat(val), mapBody)
    : ioBodyParser(rest, makeMap(parentObj, mapBody), bindBody.concat(val))
}

const ioBodyParser = (input, parentObj = {}, bindBody = [], mapBody = { stmts: [], propagate: [] }) => {
  let finalStmt = returnParser(input)
  if (notNull(finalStmt)) return maybeFinalStmt(finalStmt, input, parentObj, bindBody, mapBody)

  let bind = maybeBindStmt(input)
  if (notNull(bind)) return bindStmt(bind, parentObj, bindBody, mapBody)

  if (!isEmptyObj(parentObj)) {
    let val = parser.any(maybeDefineStmt, maybeDeleteStmt, maybeLetStmt, maybeStmtParser, maybeFuncCallStmt)(input, parentObj, bindBody, mapBody)
    if (val !== null) return val
  }

  let ioStmt = ioStmtParser(input, parentObj, mapBody)
  if (notNull(ioStmt)) return ioBodyParser(ioStmt[1], ioStmt[0], bindBody)

  let ioCall = nonReservedIdParser(input)
  if (notNull(ioCall)) return maybeIOCallStmt(ioCall, parentObj, bindBody, mapBody)

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

const ioParser = input => maybe(
  parser.all(nonReservedIdParser, equalSignParser,
             parser.any(doParser, noArgsCallParser, ioStmtParser, nonReservedIdParser))(input),
  (initIO, rest) => {
    let [doID, , maybeDo] = initIO
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
)
/* IO ends here */

const expressionParser = input => parser.any(parenthesesParser, unaryExprParser, lambdaParser, lambdaCallParser,
                                             letExpressionParser, ifExprParser, memberExprParser, arrayParser,
                                             objectParser, booleanParser, nonReservedIdParser, numberParser,
                                             nullParser, stringParser)(input)

const parenthesesParser = input => maybe(
  parser.all(openParensParser, maybeNewLineAndIndent, valueParser, maybeNewLineAndIndent, closeParensParser)(input),
  (val, rest) => {
    let [, , val_] = val
    return [val_, rest]
  }
)

const valueParser = input => parser.any(binaryExprParser, fnCallParser, expressionParser)(input)

const declParser = input => maybe(
  parser.all(nonReservedIdParser, equalSignParser, valueParser)(input),
  (val, rest) => {
    let [id, , value] = val
    return [estemplate.declaration(id, value), rest]
  }
)

/* Helper for fnDeclParser */
const funcParamsParser = (input, paramArray = []) => maybe(
  parser.all(spaceParser, parser.any(arrayParser, objectParser, nonReservedIdParser, numberParser, nullParser, stringParser))(input),
  (val, rest) => {
    let [, param] = val
    return funcParamsParser(rest, paramArray.concat(param))
  }) || [paramArray, input]

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
