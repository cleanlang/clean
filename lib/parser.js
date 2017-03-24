/*
  Parser
  Parses clean source. Generates clean AST.
*/
const estemplate = require('./estemplate')
const updateAst = require('./astupdate')
const parser = require('./parserObject')
const base = require('./basicParsers')
const utils = require('./utilityFunctions')
/* Utility Functions */
const {
  mayBe,
  returnRest,
  isEmptyObj,
  precedence,
  associativity
} = utils
/* Base Parsers */
const {
  returnParser, spaceParser, mayBeSpace, mayBeNewLineAndIndent,
  numberParser, identifierParser, nullParser, stringParser, booleanParser,
  openParensParser, closeParensParser,
  openCurlyBraceParser, closeCurlyBraceParser,
  openSquareBracketParser, closeSquareBracketParser,
  commaParser, colonParser, equalSignParser, thinArrowParser, dotParser,
  singleLineCommentParser, multiLineCommentParser,
  binaryOperatorParser, unaryOperatorParser,
  letParser, inParser,
  ifParser, thenParser, elseParser,
  slashParser, parenCheck,
  reverseBindParser, doParser, ioFuncNameParser, ioMethodNameParser, //, assignmentOperatorParser
  returnKeywordParser, deleteKeywordParser
} = base

const valueParser = input => parser.any(objectParser, binaryExprParser, unaryExprParser, letExpressionParser,
                                        ifExprParser, fnCallParser, arrayParser, memberExprParser,
                                        expressionParser)(input)

const parenthesesParser = input => {
  let result = parser.all(
    openParensParser, mayBeNewLineAndIndent,
    parser.any(lambdaCallParser, lambdaParser, letExpressionParser, ifExprParser, unaryExprParser, binaryExprParser, fnCallParser, expressionParser),
    mayBeNewLineAndIndent, closeParensParser
  )(input)

  if (result === null) return null
  let [[, , val], rest] = result
  return returnRest(val, input, rest.str)
}

const expressionParser = input => parser.any(parenthesesParser, unaryExprParser, lambdaParser, lambdaCallParser, memberExprParser, arrayParser, objectParser, parenthesesParser, booleanParser, identifierParser, numberParser, nullParser, stringParser)(input)

const unaryExprParser = parser.bind(
  parser.bind(
    unaryOperatorParser,
    operator => rest => operator === ':type'
      ? spaceParser(rest) !== null ? ['typeof', spaceParser(rest)[1]] : null
      : [operator, rest]),
  operator => rest => mayBe(expressionParser(rest),
    (argument, rest) => [estemplate.unaryExpression(operator, argument), rest])
)

const binaryExprParser = (input, opStack = ['$'], operandStack = [], expect = 'operand') => {
  let [current, rest] = [null, null] // initialize current and rest of the string to null
  let mayBeOperand = expressionParser(input)
  let mayBeOperator = binaryOperatorParser(input)
  switch (expect) {
    case 'operand': {
      [current, rest] = mayBeOperand !== null ? mayBeOperand : [null, null]
      return current === null ? null
                              : binaryExprParser(rest, opStack, operandStack.concat(current), 'operator')
    }
    case 'operator': {
      [current, rest] = mayBeOperator !== null ? mayBeOperator : [null, null]
      return current === null ? binaryExpr(opStack, operandStack, input, rest)
        : handleOrder(opStack, operandStack, current, input, rest)
    }
  }
}

const binaryExpr = (opStack, operandStack, input, rest) => {
  let opStackTop = opStack[opStack.length - 1]
  if (opStackTop === '$') {
    let binExpr = operandStack.pop()
    return binExpr.type === 'BinaryExpression' ? returnRest(binExpr, input, input.str) : null // return final expression
  }
  let [right, left, op] = [operandStack.pop(), operandStack.pop(), opStack.pop()]
  let expr = estemplate.binaryExpression(left, op, right)
  return binaryExpr(opStack, operandStack.concat(expr), input, rest)
}

const handleOrder = (opStack, operandStack, current, input, rest) => {
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

const declParser = parser.bind(
  parser.bind(
    identifierParser,
    val => input => mayBe(
        equalSignParser(input),
        (v, rest) => [val, rest]
      )
  ),
  val => input => mayBe(
    valueParser(input),
        (v, rest) => {
          return returnRest(estemplate.declaration(val, v), input, rest.str)
        }
      )
)

const paramParser = input => parser.all(spaceParser, parser.any(arrayParser, objectParser, identifierParser, numberParser, nullParser, stringParser))(input)

const paramsParser = (str, paramArray = []) => {
  let param = paramParser(str)
  if (param !== null) {
    let [[, val], rest] = param
    return paramsParser(rest, paramArray.concat(val))
  }
  return [paramArray, str]
}

const getLengthOf = params => params.map(p => p.name !== undefined
 ? p.name + ' '
 : p.raw + ' ').join().length

const fnDeclParser = parser.bind(
  parser.bind(
    parser.bind(
      identifierParser,
      val => input => mayBe(
        paramsParser(input),
        (params, rest) => {
          let lengthOfParams = getLengthOf(params)
          return returnRest(estemplate.funcDeclaration(val, params), input, rest.str, {name: 'column', value: lengthOfParams})
        }
      )
    ),
    val => input => mayBe(
        equalSignParser(input),
        (v, rest) => [val, rest]
      )
  ),
  val => input => mayBe(
    valueParser(input),
      (body, rest) => {
        val.declarations[0].init.body = body.type === 'ExpressionStatement' ? body.expression : body
        return returnRest(val, input, rest.str)
      }
    )
)

const lambdaParamParser = input => parser.all(identifierParser, spaceParser)(input)

const lambdaParamsParser = (str, lambdaparamArray = []) => {
  let arg = lambdaParamParser(str)
  if (arg !== null) {
    let [[val], rest] = arg
    return lambdaParamsParser(rest, lambdaparamArray.concat(val))
  }
  return [lambdaparamArray, str]
}

const lambdaParser = parser.bind(
  parser.bind(
    parser.bind(
      slashParser,
      val => input => mayBe(
        lambdaParamsParser(input),
        (params, rest) => returnRest(estemplate.lambda(params), input, rest.str)
       )
      ),
    val => input => mayBe(
      thinArrowParser(input),
      (v, rest) => returnRest(val, input, rest.str)
    )
   ),
   val => input => mayBe(
     valueParser(input),
     (body, rest) => {
       val.expression.body = body
       return returnRest(val, input, rest.str)
     }
   )
 )

const lambdaArgParser = input => parser.all(spaceParser, valueParser)(input)

const lambdaArgsParser = (str, lambdaArgsArray = []) => {
  let arg = lambdaArgParser(str)
  if (arg !== null) {
    let [[, val], rest] = arg
    return lambdaArgsParser(rest, lambdaArgsArray.concat(val))
  }
  return [lambdaArgsArray, str]
}

const lambdaCallParser = input => {
  let result = parser.all(openParensParser, lambdaParser, closeParensParser, lambdaArgsParser)(input)
  if (result === null) return null
  let [[, lambdaAst, , argsArr], rest] = result
  let {params, body} = lambdaAst.expression
  let val = estemplate.lambdaCall(params, argsArr, body)
  return returnRest(val, input, rest.str)
}

const letParamParser = input => parser.all(identifierParser, equalSignParser, valueParser, mayBeSpace)(input)

const letParamsParser = (str, letIdArray = [], letLiteralArray = []) => {
  let param = letParamParser(str)
  if (param !== null) {
    let [[id,, literal], rest] = param
    return letParamsParser(rest, letIdArray.concat(id), letLiteralArray.concat(literal))
  }
  return [[letIdArray, letLiteralArray], str]
}

const bindIDParser = (input, idArray = []) => {
  let result = parser.all(identifierParser, spaceParser)(input)
  if (result === null && idArray.length === 0) return null
  if (result === null) return returnRest(idArray, input, input.str)
  let [[id], rest] = result
  return bindIDParser(rest, idArray.concat(id))
}

const bindStatementParser = input => parser.all(bindIDParser, reverseBindParser,
                                                parser.any(fnCallParser, parser.all(
                                                  ioFuncNameParser,
                                                  mayBeSpace,
                                                  argsParser),
                                                           identifierParser))(input)

const letStmtParser = input => {
  let result = parser.all(letParser, letParamsParser)(input)
  if (result === null) return null
  let [[, [idArray, valArray]], rest] = result
  return returnRest([idArray, valArray], input, rest.str)
}

const makeMapChain = (idArray, valArray, parentObj) => {
  if (idArray.length === 0 && valArray.length === 0) return parentObj
  let cbParams = parentObj.nextParams
  let cbBody = estemplate.array([valArray[0]].concat(cbParams))
  let nextParams = [idArray[0]].concat(cbParams)
  let callBack = estemplate.lambda(cbParams, cbBody).expression
  let nextParent = estemplate.ioMap(parentObj, callBack, nextParams)
  return makeMapChain(idArray.slice(1), valArray.slice(1), nextParent)
}

const ioStmtParser = (input, parentObj) => {
  let result = parser.all(ioFuncNameParser, spaceParser, argsParser)(input)
  if (result === null) return null
  let [[id, , args], rest] = result
  if (isEmptyObj(parentObj)) {
    let val = estemplate.ioCall(id, args)
    val.sType = 'IO'
    return returnRest(val, input, rest.str)
  }
  let val = estemplate.ioStmt(id, parentObj, args, parentObj.nextParams)
  return returnRest(val, input, rest.str)
}

const getCbBody = (thenBody, parentObj) => {
  if (thenBody.length === 0) return parentObj
  let callBack = estemplate.lambda(parentObj.nextParams, thenBody[0]).expression
  let val = estemplate.ioBind(parentObj, callBack, parentObj.nextParams)
  val.nextParams = parentObj.nextParams
  return getCbBody(thenBody.slice(1), val)
}

const handlerParser = input => {
  let result = parser.all(openParensParser,
                          parser.any(
                            fnCallParser,
                            parser.all(ioFuncNameParser, spaceParser, argsParser),
                            lambdaCallParser),
                          closeParensParser)(input)
  if (result === null) return null
  let [[, val], rest] = result
  return returnRest(val, input, rest.str)
}

const mayBeStmtParser = input => parser.all(ioMethodNameParser, spaceParser, expressionParser, spaceParser, handlerParser)(input)

const defineStmtParser = input => {
  let result = parser.all(identifierParser, spaceParser, parser.any(memberExprParser, identifierParser), spaceParser, stringParser, spaceParser, valueParser)(input)
  if (result === null) return null
  let [val, rest] = result
  let [id] = val
  if (id.name !== 'defineProp') return null
  return returnRest(val, input, rest.str)
}

const deleteStmtParser = input => parser.all(deleteKeywordParser, spaceParser, parser.any(memberExprParser, identifierParser))(input)

const getIOBody = (input, parentObj = {}, thenBody = []) => {
  let finalStmt = returnParser(input)
  if (finalStmt !== null) {
    let [, rest] = finalStmt
    let result = spaceParser(rest)
    if (result === null) {
      if (isEmptyObj(parentObj) && thenBody.length === 0) return null
      if (isEmptyObj(parentObj) && thenBody.length !== 0) {
        parentObj = getCbBody(thenBody.slice(1), thenBody[0])
        let val = estemplate.defaultIOThen(parentObj)
        return returnRest(val, input, rest.str)
      }

      let cbParams = parentObj.nextParams === undefined ? [] : parentObj.nextParams
      let cbBody = thenBody
      let length = thenBody.length
      let singleFnCall = length !== 0 &&
          thenBody.slice(0, -1).filter(e => e.type === 'CallExpression').length === 0 &&
          thenBody[length - 1].expression.type === 'CallExpression'
      if (parentObj.returnVals !== undefined) {
        parentObj = getCbBody(cbBody, parentObj)
        let returnVals = parentObj.returnVals
        let callBack = estemplate.lambda(cbParams, estemplate.array(returnVals)).expression
        let val = estemplate.ioMap(parentObj, callBack, cbParams)
        val.sType = 'IO'
        return returnRest(val, input, rest.str)
      } else {
        parentObj = singleFnCall ? getCbBody(thenBody.slice(0, -1), parentObj) : getCbBody(thenBody, parentObj)
        let cbBody = singleFnCall ? estemplate.blockStmt(thenBody.slice(-1)) : estemplate.array(thenBody)
        let callBack = estemplate.lambda(cbParams, cbBody).expression
        let val = estemplate.ioThen(parentObj, callBack, cbParams)
        val.sType = 'IO'
        return returnRest(val, input, rest.str)
      }
    }

    [, rest] = result
    let mayBeReturn = parser.all(returnKeywordParser, spaceParser, argsParser)(rest)

    if (mayBeReturn !== null) {
      [[, , parentObj.returnVals], rest] = mayBeReturn
    }
    return getIOBody(rest, parentObj, thenBody)
  }

  let mayBeBind = bindStatementParser(input)
  if (mayBeBind !== null) {
    let [[bindID, , mayBeIOFunc], rest] = mayBeBind
    let nextParams = parentObj.nextParams === undefined ? bindID : parentObj.nextParams.concat(bindID)
    let isFuncCall = mayBeIOFunc.type !== undefined && mayBeIOFunc.expression.type === 'CallExpression'
    let isIOCall = mayBeIOFunc.type !== undefined && mayBeIOFunc.type === 'Identifier'
    let [ioFunc, , args] = isIOCall || isFuncCall ? [null, null, null] : mayBeIOFunc

    if (ioFunc !== null && ioFunc.name === 'IO' && args[0].type === 'CallExpression') {
      let [func] = args
      let cb = estemplate.identifier('cb')
      ioFunc.name = 'createIO'
      func.arguments = func.arguments.concat(cb)
      args = [estemplate.lambda([cb], func).expression]
    }

    if (isEmptyObj(parentObj)) {
      let val = isIOCall || isFuncCall ? mayBeIOFunc : estemplate.ioCall(ioFunc, args, nextParams)
      if (isFuncCall) val = val.expression
      val.nextParams = isIOCall || isFuncCall ? nextParams : val.nextParams
      return getIOBody(rest, val, thenBody)
    }
    let cbBody = isIOCall || isFuncCall ? mayBeIOFunc : estemplate.ioCall(ioFunc, args, nextParams)
    if (isFuncCall) cbBody = cbBody.expression
    cbBody.nextParams = isIOCall ? nextParams : cbBody.nextParams
    let cbParams = parentObj.nextParams
    let callBack = estemplate.lambda(cbParams, cbBody)
    return getIOBody(rest, estemplate.ioBind(parentObj, callBack, nextParams), thenBody)
  }

  let mayBeDefineProp = defineStmtParser(input)
  if (mayBeDefineProp !== null && !isEmptyObj(parentObj)) {
    let [[, , objID, , key, , value], rest] = mayBeDefineProp
    let defineProp = estemplate.defineProp(objID, key, value)
    let nextParams = parentObj.nextParams
    let returnVal = estemplate.returnStmt(nextParams)
    let cbBody = estemplate.blockStmt([defineProp, returnVal])
    let callBack = estemplate.lambda(nextParams, cbBody)
    let val = estemplate.ioMap(parentObj, callBack, nextParams)
    return getIOBody(rest, val, thenBody)
  }

  let mayBeDelete = deleteStmtParser(input)
  if (mayBeDelete !== null && !isEmptyObj(parentObj)) {
    let [[deleteKeyword, , objProp], rest] = mayBeDelete
    let deleteStmt = estemplate.unaryExpression(deleteKeyword, objProp)
    let nextParams = parentObj.nextParams
    let returnVal = estemplate.returnStmt(nextParams)
    let cbBody = estemplate.blockStmt([deleteStmt, returnVal])
    let callBack = estemplate.lambda(nextParams, cbBody)
    let val = estemplate.ioMap(parentObj, callBack, nextParams)
    return getIOBody(rest, val, thenBody)
  }

  let mayBeLet = letStmtParser(input)
  if (mayBeLet !== null && !isEmptyObj(parentObj)) {
    let [[idArray, valArray], rest] = mayBeLet
    let mapChain = makeMapChain(idArray, valArray, parentObj)
    return getIOBody(rest, mapChain, thenBody)
  }

  let mayBeStmt = mayBeStmtParser(input)
  if (mayBeStmt !== null && !isEmptyObj(parentObj)) {
    let [[methodName, , value, , handler], rest] = mayBeStmt
    let args = []
    let nextParams = parentObj.nextParams
    let handlerBody = handler
    if (Array.isArray(handler)) {
      let [ioFunc, , _args] = handler
      args = _args
      handler = ioFunc
      handlerBody = estemplate.defaultIOThen(estemplate.ioCall(handler, args))
    }
    let handler_ = estemplate.lambda(nextParams, handlerBody).expression
    let mayBeVal = estemplate.lambda(nextParams, value).expression
    let val = estemplate.ioMayBe(parentObj, methodName, [mayBeVal, handler_], nextParams)
    return getIOBody(rest, val, thenBody)
  }

  let mayBeIOStmt = ioStmtParser(input, parentObj)
  if (mayBeIOStmt !== null) {
    let [val, rest] = mayBeIOStmt
    return getIOBody(rest, val, thenBody)
  }

  let mayBeFuncCall = fnCallParser(input)
  if (mayBeFuncCall !== null && !isEmptyObj(parentObj)) {
    let [fnCall, rest] = mayBeFuncCall
    return getIOBody(rest, parentObj, thenBody.concat(fnCall))
  }

  let mayBeIOCall = identifierParser(input)
  if (mayBeIOCall !== null) {
    let [ioID, rest] = mayBeIOCall
    if (isEmptyObj(parentObj)) {
      ioID.nextParams = []
    }
    let val = ioID
    return getIOBody(rest, parentObj, thenBody.concat(val))
  }

  return null
}

const noArgsCallParser = input => {
  let result = parser.all(
    parser.any(memberExprParser, parenthesesParser, identifierParser),
    spaceParser, openParensParser, closeParensParser
  )(input)
  if (result === null) return null
  let [[callee], rest] = result
  return returnRest(estemplate.fnCall(callee, []), input, rest.str)
}

const ioParser = input => {
  let initIO = parser.all(identifierParser, equalSignParser, parser.any(doParser, noArgsCallParser, ioStmtParser, identifierParser))(input)
  if (initIO === null) return null
  let [[doID, , mayBeDo], rest] = initIO
  if (mayBeDo.type !== undefined && mayBeDo.type === 'Identifier' && doID.name !== 'main') return null
  if (mayBeDo.type !== undefined && mayBeDo.type === 'CallExpression' && doID.name !== 'main') {
    let val = mayBeDo
    val.sType = 'IO'
    return returnRest(estemplate.declaration(doID, val), input, rest.str)
  }

  let ioBody
  if (mayBeDo === 'do') {
    let result = getIOBody(rest)
    if (result === null) { return null }
    [ioBody, rest] = result
    ioBody.expression = false
  } else {
    ioBody = estemplate.defaultIOThen(mayBeDo)
  }

  ioBody.sType = 'IO'
  let val = estemplate.declaration(doID, ioBody)
  val.sType = 'IO'
  return returnRest(val, input, rest.str)
}

const doBlockParser = input => {
  let result = parser.all(doParser, getIOBody)(input)
  if (result === null) return null
  let [[, doBlock], rest] = result
  return returnRest(estemplate.expression(doBlock), input, rest.str)
}

const doFuncParser = input => {
  let result = parser.all(identifierParser, paramsParser, equalSignParser, doBlockParser)(input)
  if (result === null) return null
  let [[funcId,params, , funcBody], rest] = result
  let val = estemplate.funcDeclaration(funcId, params, funcBody.expression)
  val.sType = 'IO'
  return returnRest(val, input, rest.str)
}

const letExpressionParser = parser.bind(
  parser.bind(
    parser.bind(
      letParser,
      val => input => mayBe(
          letParamsParser(input),
          (val, rest) => returnRest(estemplate.letExpression(val[0], val[1]), input, rest.str)
       )
    ),
    val => input => mayBe(
        inParser(input),
        (v, rest) => returnRest(val, input, rest.str)
      )
  ),
  val => input => mayBe(
    valueParser(input),
      (body, rest) => {
        val.callee.body = body.type === 'ExpressionStatement' ? body.expression : body
        return returnRest(val, input, rest.str)
      }
    )
  )

const formMemberExpression = (input, obj) => {
  let prop = parser.any(dotParser, subscriptParser, identifierParser)(input)
  if (prop === null) return returnRest(obj, input, input.str)
  let [exp, rest] = prop
  if (exp.isSubscript) return formMemberExpression(rest, estemplate.subscriptExpression(obj, exp))
  exp.isSubscript = false
  if (exp.type === 'Identifier') return formMemberExpression(rest, estemplate.memberExpression(obj, exp))
  return formMemberExpression(rest, obj)
}

const memberExprParser = input => {
  let parentObj = parser.any(arrayParser, identifierParser, parenthesesParser)(input)
  if (parentObj === null) return null
  let [obj, rest] = parentObj
  let result = formMemberExpression(rest, obj)
  let [memExpr, _rest] = result
  memExpr = memExpr.type === 'ExpressionStatement' ? memExpr.expression : memExpr
  return memExpr.type === 'MemberExpression' ? returnRest(memExpr, input, _rest.str) : null
}

const subscriptParser = input => {
  let result = parser.all(
  openSquareBracketParser,
  parser.any(memberExprParser, identifierParser, numberParser, stringParser),
    closeSquareBracketParser)(input)
  if (result !== null) {
    let [[, prop], rest] = result
    prop.isSubscript = true
    return returnRest(prop, input, rest.str)
  }
  return null
}

const argsParser = (input, argArray = []) => {
  let arg = parser.all(
    parser.any(unaryExprParser, expressionParser),
    parser.any(returnParser, parenCheck, spaceParser))(input)
  if (arg === null) return argArray.length === 0 ? null : [argArray, input]
  let [[argument, nextChar], rest] = arg
  if (nextChar === '\n' || nextChar === ')') {
    rest.str = nextChar === '\n' ? '\n' + rest.str : rest.str
    return [argArray.concat(argument), rest]
  }
  return argsParser(rest, argArray.concat(argument))
}

const fnCallParser = parser.bind(
  parser.all(parser.any(memberExprParser, identifierParser), spaceParser),
  val => input => mayBe(
      argsParser(input),
      (args, rest) => {
        let [id] = val
        let callExpr = estemplate.fnCall(id, args)
        if (rest.str.startsWith('\n')) return returnRest(estemplate.expression(callExpr), input, rest.str)
        return returnRest(callExpr, input, rest.str)
      }
    )
)

const ifExprParser = input => mayBe(
  parser.all(
    ifParser, valueParser,
    mayBeNewLineAndIndent, thenParser, valueParser,
    mayBeNewLineAndIndent, elseParser, valueParser)(input),
    (val, rest) => {
      let [, condition, , , consequent, , , alternate] = val
      return returnRest(estemplate.ifthenelse(condition, consequent, alternate), input, rest.str)
    }
)

const statementParser = input => parser.any(multiLineCommentParser, singleLineCommentParser, returnParser, doBlockParser, ioParser, doFuncParser, declParser, ifExprParser, fnDeclParser, fnCallParser, lambdaParser, lambdaCallParser, spaceParser)(input)

const programParser = (input, ast = estemplate.ast()) => {
  let [, rest] = returnRest('', input, input.str)
  let result = statementParser(rest)
  if (result === null) {
    if (input.str === '') return updateAst(ast)
    return new SyntaxError(`\n\n${input.str}\n ...at line: ${input.line}`)
  }
  if (typeof result[0] !== 'string') ast.body.push(result[0])
  return programParser(result[1], ast)
}

const keyParser = input => parser.any(identifierParser, stringParser, numberParser)(input)

const arrayElemParser = input => mayBe(
  parser.all(mayBeNewLineAndIndent, valueParser, mayBeSpace)(input),
  (val, rest) => {
    let [ , value, , ] = val
    return [value, rest]
  }
)

const commaCheck = (input, propArr) => {
  let [, rest] = mayBeSpace(input)
  let comma = commaParser(rest)
  if (comma !== null) {
    propArr.push(null)
    let [, rest] = comma
    return arrayElemsParser(rest, propArr)
  }
  return [propArr, rest]
}

const arrayElemsParser = (input, propArr = []) => {
  let result = arrayElemParser(input)
  if (result === null) return commaCheck(input, propArr)

  let [val, rest] = result
  propArr.push(val)

  let comma = commaParser(rest)
  if (comma === null) return [propArr, rest]
  let [, _rest] = comma
  return arrayElemsParser(_rest, propArr)
}

const arrayParser = input => {
  let openSquareBracket, closeSquareBracket
  if (!(openSquareBracket = openSquareBracketParser(input))) return null
  let [, rest] = openSquareBracket
  let result = arrayElemsParser(rest)
  if (result === null) return null
  let [arrayPropAst, arrayPropsRest] = result
  if (!(closeSquareBracket = parser.all(mayBeNewLineAndIndent, closeSquareBracketParser)(arrayPropsRest))) return null
  rest = closeSquareBracket[1]
  return [estemplate.array(arrayPropAst), rest]
}

const objectParser = input => {
  let openCurlyResult, closeCurlyResult
  if (!(openCurlyResult = openCurlyBraceParser(input))) return null
  let [, rest] = openCurlyResult
  let result = objectPropsParser(rest)
  if (result === null) return null
  let [objPropArray, objPropsRest] = result
  objPropsRest = mayBeSpace(objPropsRest)
  if (!(closeCurlyResult = parser.all(mayBeNewLineAndIndent, closeCurlyBraceParser)(objPropsRest[1]))) return null
  rest = closeCurlyResult[1]
  return [estemplate.object(objPropArray), rest]
}

const objectPropParser = input => mayBe(
  parser.all(mayBeNewLineAndIndent, keyParser, mayBeSpace, colonParser,
             mayBeSpace, valueParser, mayBeSpace)(input),
    (val, rest) => {
      let [ , key, , , , value, , ] = val
      return [estemplate.objectProperty(key, value), rest]
    }
)

const objectPropsParser = (input, propArr = []) => {
  let result = objectPropParser(input)
  let commaResult
  if (result === null) return [propArr, input]
  let [val, rest] = result
  propArr.push(val)
  if (!(commaResult = commaParser(rest))) return [propArr, rest]
  rest = commaResult[1]
  if (closeCurlyBraceParser(rest)) return null
  return objectPropsParser(rest, propArr)
}

/*  Module Exports programParser  */
module.exports = programParser
