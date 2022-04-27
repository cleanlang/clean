/**
 * Parses clean source. Generates clean AST.
 *
 *
 * All parsers take an input object and return an array of two values:
 *  - val1 = An ECMAScript compliant syntax tree of the input that was parsed
 *  - val2 = An object with the following fields:
 *      - str: rest of the string
 *      - line: line number
 *      - column: column number
 *
 *
 * All statements with `.expression` are used to unwrap an expression from within
 * an `ExpressionStatement`
 * All IO is converted into a syntax tree that can be handled by
 * `node-core`/`browser-core`
 */

const estemplate = require('./estemplate')
const updateAst = require('./astupdate')
const parser = require('./parserObject')
const base = require('./basicParsers')
const utils = require('./utilityFunctions')
const errorMsg = require('./errors')
const { reservedFnCalls } = require('./languageConstructs')

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
  binaryOperatorParser,
  booleanParser,
  closeCurlyBraceParser,
  closeParensParser,
  closeSquareBracketParser,
  colonParser,
  commaParser,
  definePropParser,
  deleteKeywordParser,
  doParser,
  domMethodParser,
  dotParser,
  elseParser,
  emptyArgsParser,
  equalSignParser,
  identifierParser,
  ifParser,
  inParser,
  ioFuncNameParser,
  ioMethodNameParser,
  letParser,
  maybeNewLineAndIndent,
  maybeSpace,
  multiLineCommentParser,
  nonReservedIdParser,
  nonReservedIdFnCallParser,
  nullParser,
  numberParser,
  otherwiseParser,
  openCurlyBraceParser,
  openParensParser,
  openSquareBracketParser,
  regexParser,
  returnKeywordParser,
  returnParser,
  reverseBindParser,
  singleLineCommentParser,
  slashParser,
  spaceParser,
  stringParser,
  thenParser,
  thinArrowParser,
  unaryOperatorParser,
  vBarParser,
  whereParser
} = base

const nonExprStatements = ['BlockStatement']

const unaryExprParser = (input) =>
  parser.bind(
    parser.bind(
      unaryOperatorParser,
      (operator) => (rest) =>
        operator === ':type'
          ? notNull(spaceParser(rest))
              ? ['typeof', spaceParser(rest)[1]]
              : null
          : [operator, rest]
    ),
    (operator) => (rest) =>
      maybe(expressionParser(rest), (argument, rest) => [
        estemplate.unaryExpression(operator, argument),
        rest
      ])
  )(input)

/* Helper functions for binaryExprParser */
const formBinaryExpr = (opStack, operandStack, input, rest) => {
  const opStackTop = opStack[opStack.length - 1]
  if (opStackTop === '$') {
    const binExpr = operandStack.pop()
    return binExpr.type === 'BinaryExpression'
      ? [binExpr, input]
      : null // return final expression
  }
  const [right, left, op] = [
    operandStack.pop(),
    operandStack.pop(),
    opStack.pop()
  ]
  const expr = estemplate.binaryExpression(left, op, right)
  return formBinaryExpr(
    opStack,
    operandStack.concat(expr),
    input,
    rest
  )
}

const handlePrecAssoc = (opStack, operandStack, current, rest) => {
  const opStackTop = opStack[opStack.length - 1]
  const currentHasHigher = precedence(current) > precedence(opStackTop)
  const currentHasLower = precedence(current) < precedence(opStackTop)
  const currentHasEqual = !currentHasLower && !currentHasHigher
  const isRightAssociative =
    currentHasEqual && associativity(current) === 'R'
  const isLeftAssociative =
    currentHasEqual && associativity(current) === 'L'

  if (currentHasHigher || isRightAssociative) {
    return binaryExprParser(
      rest,
      opStack.concat(current),
      operandStack,
      'operand'
    )
  }

  if (currentHasLower || isLeftAssociative) {
    const [right, left, op] = [
      operandStack.pop(),
      operandStack.pop(),
      opStack.pop()
    ]
    const expr = estemplate.binaryExpression(left, op, right)
    return binaryExprParser(
      rest,
      opStack.concat(current),
      operandStack.concat(expr),
      'operand'
    )
  }
}

const binaryExprParser = (
  input,
  opStack = ['$'],
  operandStack = [],
  expect = 'operand'
) => {
  let [current, rest] = [null, null] // initialize current and rest of the string to null
  switch (expect) {
    case 'operand': {
      const maybeOperand = parser.any(
        fnCallParser,
        expressionParser
      )(input);
      [current, rest] = notNull(maybeOperand)
        ? maybeOperand
        : [null, null]
      return isNull(current)
        ? null
        : binaryExprParser(
          rest,
          opStack,
          operandStack.concat(current),
          'operator'
        )
    }
    case 'operator': {
      const maybeOperator = binaryOperatorParser(input);
      [current, rest] = notNull(maybeOperator)
        ? maybeOperator
        : [null, null]
      return notNull(current)
        ? handlePrecAssoc(opStack, operandStack, current, rest)
        : formBinaryExpr(opStack, operandStack, input, rest)
    }
  }
}
/* binaryExprParser ends */

const ifExprParser = (input) =>
  maybe(
    parser.all(
      ifParser,
      valueParser,
      maybeNewLineAndIndent,
      thenParser,
      valueParser,
      maybeNewLineAndIndent,
      elseParser,
      valueParser
    )(input),
    (val, rest) => {
      const [, condition, , , consequent, , , alternate] = val
      return [
        estemplate.ifthenelse(condition, consequent, alternate),
        rest
      ]
    }
  )

/* Helper functions for letExpressionParser */
const letParamParser = (input) =>
  parser.all(
    nonReservedIdParser,
    equalSignParser,
    valueParser,
    maybeSpace
  )(input)

const letParamsParser = (str, letIdArray = [], letLiteralArray = []) =>
  maybe(letParamParser(str), (val, rest) => {
    const [id, , literal] = val
    return letParamsParser(
      rest,
      letIdArray.concat(id),
      letLiteralArray.concat(literal)
    )
  }) || [[letIdArray, letLiteralArray], str]

const letExpressionParser = (input) =>
  maybe(
    parser.all(
      letParser,
      letParamsParser,
      inParser,
      valueParser
    )(input),
    (val, rest) => {
      const [, [letIdArray, letLiteralArray], , expr] = val
      const letExpr = estemplate.letExpression(
        letIdArray,
        letLiteralArray,
        expr
      )
      return [letExpr, rest]
    }
  )

/* Helper functions for lambdaParser */
const paramsParser = (input, idArray = []) =>
  maybe(
    parser.all(nonReservedIdParser, spaceParser)(input),
    (val, rest) => {
      const [val_] = val
      return paramsParser(rest, idArray.concat(val_))
    }
  ) || [idArray, input]

const lambdaParser = (input) =>
  maybe(
    parser.all(
      slashParser,
      paramsParser,
      thinArrowParser,
      valueParser
    )(input),
    (val, rest) => {
      const [, params, , expr] = val
      return [estemplate.lambda(params, expr), rest]
    }
  )

/* Helper functions for fnCallParser */
const argsParser = (input, argArray = []) => {
  const maybeArg = expressionParser(input)
  if (isNull(maybeArg)) {
    return isEmptyArr(argArray) ? null : [argArray, input]
  }
  const [arg, rest] = maybeArg
  argArray = argArray.concat(arg)
  const result = spaceParser(rest)
  if (isNull(result)) return [argArray, rest]
  const [, _res] = result
  return argsParser(_res, argArray)
}

const calleeParser = (input) =>
  parser.any(memberExprParser, nonReservedIdParser)(input)

const fnArgsParser = (input) =>
  parser.any(emptyArgsParser, argsParser)(input)

const fnCallParser = (input) =>
  maybe(
    parser.all(calleeParser, spaceParser, fnArgsParser)(input),
    (val, rest) => {
      const [callee, , args] = val
      const callExpr = reservedFnCalls[callee.name]
        ? estemplate.reservedCalls[callee.name](args)
        : estemplate.fnCall(callee, args)
      const expr =
        rest.str.startsWith('\n') || /^()()$/.test(rest.str)
          ? estemplate.expression(callExpr)
          : callExpr
      return [expr, rest]
    }
  )

/* Helper functions for lambdaCallParser */
const lambdaArgsParser = (input, lambdaArgsArray = []) =>
  maybe(parser.all(spaceParser, valueParser)(input), (val, rest) => {
    const [, arg] = val
    return lambdaArgsParser(rest, lambdaArgsArray.concat(arg))
  }) || [lambdaArgsArray, input]

const lambdaCallParser = (input) =>
  maybe(
    parser.all(
      openParensParser,
      lambdaParser,
      closeParensParser,
      lambdaArgsParser
    )(input),
    (val, rest) => {
      const [, lambdaAst, , argsArr] = val
      const { params, body } = lambdaAst.expression
      const val_ = estemplate.lambdaCall(params, argsArr, body)
      return [val_, rest]
    }
  )

/* Parsers for structures */

/* Helper functions for structure parsers */
const commaCheck = (input, propArr) =>
  maybe(parser.all(maybeSpace, commaParser)(input), (val, rest) => {
    propArr.push(null)
    return arrayElemsParser(rest, propArr)
  }) || [propArr, input]

/* Helper functions for arrayParser */
const arrayElemParser = (input) =>
  maybe(
    parser.all(maybeNewLineAndIndent, valueParser, maybeSpace)(input),
    (val, rest) => {
      const [, value] = val
      return [value, rest]
    }
  )

const arrayElemsParser = (input, propArr = []) => {
  const result = arrayElemParser(input)
  if (isNull(result)) return commaCheck(input, propArr)
  const [val, rest] = result
  propArr.push(val)
  const comma = commaParser(rest)
  if (isNull(comma)) return [propArr, rest]
  const [, _rest] = comma
  return arrayElemsParser(_rest, propArr)
}

const arrayParser = (input) => {
  const openSquareBracket = openSquareBracketParser(input)
  if (isNull(openSquareBracket)) return null
  let [, rest] = openSquareBracket
  const result = arrayElemsParser(rest)
  const [arrayPropAst, arrayPropsRest] = result
  const closeSquareBracket = parser.all(
    maybeNewLineAndIndent,
    closeSquareBracketParser
  )(arrayPropsRest)
  if (isNull(closeSquareBracket)) {
    return null
  }
  [, rest] = closeSquareBracket
  return [estemplate.array(arrayPropAst), rest]
}

/* Helper functions for objectParser */
const keyParser = (input) =>
  parser.any(identifierParser, stringParser, numberParser)(input)

const objectPropParser = (input) =>
  maybe(
    parser.all(
      maybeNewLineAndIndent,
      keyParser,
      maybeSpace,
      colonParser,
      maybeSpace,
      valueParser,
      maybeSpace
    )(input),
    (val, rest) => {
      const [, key, , , , value] = val
      return [estemplate.objectProperty(key, value), rest]
    }
  )

const objectPropsParser = (input, propArr = []) => {
  const result = objectPropParser(input)
  if (isNull(result)) return [propArr, input]
  let [val, rest] = result
  propArr.push(val)
  const commaResult = commaParser(rest)
  if (isNull(commaResult)) {
    return [propArr, rest]
  }
  [, rest] = commaResult
  const closeCurlyBrace = closeCurlyBraceParser(rest)
  if (notNull(closeCurlyBrace)) return null
  return objectPropsParser(rest, propArr)
}

const objectParser = (input) => {
  const openCurlyResult = openCurlyBraceParser(input)
  if (isNull(openCurlyResult)) return null
  let [, rest] = openCurlyResult
  const result = objectPropsParser(rest)
  if (isNull(result)) return null
  const [objPropArray, objPropsRest] = result
  const closeCurlyResult = parser.all(
    maybeSpace,
    maybeNewLineAndIndent,
    closeCurlyBraceParser
  )(objPropsRest)
  if (isNull(closeCurlyResult)) {
    return null
  }
  [, rest] = closeCurlyResult
  return [estemplate.object(objPropArray), rest]
}
/* end of structure parsers */

/* Helper functions for memberExprParser */
const formMemberExpression = (input, obj) => {
  const prop = parser.any(
    dotParser,
    subscriptParser,
    identifierParser
  )(input)
  if (isNull(prop)) return [obj, input]
  const [exp, rest] = prop
  if (exp.isSubscript) {
    return formMemberExpression(
      rest,
      estemplate.subscriptExpression(obj, exp)
    )
  }
  exp.isSubscript = false
  if (exp.type === 'Identifier') {
    return formMemberExpression(
      rest,
      estemplate.memberExpression(obj, exp)
    )
  }
  return formMemberExpression(rest, obj)
}

const subscriptParser = (input) =>
  maybe(
    parser.all(
      openSquareBracketParser,
      parser.any(
        memberExprParser,
        nonReservedIdParser,
        numberParser,
        stringParser
      ),
      closeSquareBracketParser
    )(input),
    (val, rest) => {
      const [, prop] = val
      prop.isSubscript = true
      return [prop, rest]
    }
  )

const memberExprParser = (input) =>
  maybe(
    parser.any(
      arrayParser,
      nonReservedIdParser,
      parenthesesParser
    )(input),
    (val, rest) => {
      const obj = val
      const result = formMemberExpression(rest, obj)
      let [memExpr, _rest] = result
      memExpr =
        memExpr.type === 'ExpressionStatement'
          ? memExpr.expression
          : memExpr
      return memExpr.type === 'MemberExpression'
        ? [memExpr, _rest]
        : null
    }
  )

const defineStmtParser = (input) =>
  maybe(
    parser.all(
      definePropParser,
      spaceParser,
      parser.any(memberExprParser, nonReservedIdParser),
      spaceParser,
      parser.any(stringParser, nonReservedIdParser, valueParser),
      spaceParser,
      valueParser
    )(input),
    (val, rest) => {
      const [, , objID, , key, , value] = val
      const definePropStmt = estemplate.defineProp(
        objID,
        key,
        value,
        false
      )
      return [definePropStmt, rest]
    }
  )

/* IO helpers */

const makeBlock = (mapBody, cbBody) =>
  estemplate.blockStmt(mapBody.stmts.concat(cbBody))

const makeReturnArray = (val) =>
  estemplate.returnStmt(estemplate.array(val))

/* IO parsers */

// DOM statements inside parenthesis
const parensDOMStmt = (input) =>
  maybe(
    parser.all(
      openParensParser,
      maybeDOMStmt,
      closeParensParser
    )(input),
    (val, rest) => {
      const [, expr] = val
      return [expr, rest]
    }
  )

// check if staticIOMethod from ioMethod.js
const ioFuncName = (input) =>
  parser.all(
    ioFuncNameParser,
    spaceParser,
    parser.any(parensDOMStmt, argsParser)
  )(input)

const doBlockParser = (input) =>
  maybe(parser.all(doParser, ioBodyParser)(input), (val, rest) => {
    const [, doBlock] = val
    return [estemplate.expression(doBlock), rest]
  })

/*
  Parser for do blocks inside function declarations with arguments
  func a b = do
             expression
*/
const doFuncParser = (input) =>
  maybe(
    parser.all(
      nonReservedIdParser,
      funcParamsParser,
      equalSignParser,
      doBlockParser
    )(input),
    (val, rest) => {
      let [funcId, params, , funcBody] = val
      funcBody =
        notUndefined(funcBody.expression) &&
        funcBody.expression.type === 'ArrowFunctionExpression'
          ? funcBody.expression.body
          : funcBody
      funcBody.sType = 'IO'
      const val_ = estemplate.funcDeclaration(funcId, params, funcBody)
      return [val_, rest]
    }
  )

const ioStmtParser = (
  input,
  parentObj,
  mapBody = { stmts: [], propagate: [] }
) =>
  maybe(ioFuncName(input), (val, rest) => {
    const [id, , args] = val
    if (isEmptyObj(parentObj)) {
      const val_ = estemplate.ioCall(id, args)
      val_.sType = 'IO'
      return [val_, rest]
    }
    const ioFunc = estemplate.ioFunc(id, args)
    const callBack = isEmptyArr(mapBody.stmts)
      ? estemplate.lambda(
          parentObj.nextParams,
          estemplate.array(parentObj.nextParams.concat(ioFunc))
        )
      : estemplate.lambda(
        parentObj.nextParams,
        makeBlock(
          mapBody,
          makeReturnArray(
            parentObj.nextParams.concat(
              mapBody.propagate.concat(ioFunc)
            )
          )
        )
      )
    parentObj.nextParams = parentObj.nextParams.concat(
      mapBody.propagate
    )
    const val_ = estemplate.ioBind(
      parentObj,
      callBack,
      parentObj.nextParams
    )
    return [val_, rest]
  })

/*
  function calls without arguments of the form
  func()
*/
const noArgsCallParser = (input) =>
  maybe(
    parser.all(
      parser.any(
        memberExprParser,
        parenthesesParser,
        nonReservedIdParser
      ),
      spaceParser,
      openParensParser,
      closeParensParser
    )(input),
    (val, rest) => {
      const [callee] = val
      return [estemplate.fnCall(callee, []), rest]
    }
  )

/* Helper functions for bindStatementParser */
const bindIDParser = (input) => {
  const result = paramsParser(input)
  return isEmptyArr(result[0]) ? null : result
}

const maybeDOMStmt = (input) =>
  maybe(
    parser.all(domMethodParser, spaceParser, argsParser)(input),
    (val, rest) => {
      const [domFunc, , args] = val
      const callExpr = estemplate.expression(
        estemplate.fnCall(domFunc, args)
      )
      const expr =
        rest.str.startsWith('\n') || /^()()$/.test(rest.str)
          ? estemplate.expression(callExpr)
          : callExpr
      return [expr, rest]
    }
  )

/*
  Parses bind statement of the form
  a b <- func c
  args <- ioFunctions params
  args <- identifier
*/
const maybeBindStmt = (input) =>
  parser.all(
    bindIDParser,
    reverseBindParser,
    parser.any(
      fnCallParser,
      maybeDOMStmt,
      ioFuncName,
      nonReservedIdParser
    )
  )(input)

const isIOorFuncCall = (maybeIOFunc) => {
  const isFuncCall =
    notUndefined(maybeIOFunc.type, maybeIOFunc.expression) &&
    maybeIOFunc.expression.type === 'CallExpression'
  const isIOCall =
    notUndefined(maybeIOFunc.type) && maybeIOFunc.type === 'Identifier'
  return [isFuncCall, isIOCall]
}

/*
  Modifies the syntax tree when an IO is created
  args <- IO (func params) is translated to args <- createIO (func params)
  `createIO` is a method in the core library
*/
const createIOBody = (args, ioFunc) => {
  const [func] = args
  const cb = estemplate.identifier('cb')
  ioFunc.name = 'createIO'
  func.arguments = func.arguments.concat(cb)
  return [estemplate.lambda([cb], func)]
}

const makeBind = (
  isIOorFunc,
  isIOCall,
  maybeIOFunc,
  ioFunc,
  args,
  nextParams
) => {
  const cbBody = isIOorFunc
    ? maybeIOFunc
    : estemplate.ioCall(ioFunc, args, nextParams)
  cbBody.nextParams = isIOCall ? nextParams : cbBody.nextParams
  return cbBody
}

const formBindStmt = (
  cbBody,
  parentObj,
  nextParams,
  rest,
  bindBody,
  mapBody
) => {
  const cbParams = parentObj.nextParams
  const callBack = isEmptyArr(mapBody.stmts)
    ? estemplate.lambda(
        cbParams,
        estemplate.array(cbParams.concat(cbBody))
      )
    : estemplate.lambda(
      cbParams,
      makeBlock(
        mapBody,
        makeReturnArray(
          cbParams.concat(mapBody.propagate).concat(cbBody)
        )
      )
    )
  parentObj = estemplate.ioBind(parentObj, callBack, cbParams)
  parentObj.nextParams = nextParams
  return ioBodyParser(rest, parentObj, bindBody)
}

const bindStmt = (maybeBind, parentObj, bindBody, mapBody) => {
  let [[bindID, , maybeIOFunc], rest] = maybeBind
  let nextParams = isUndefined(parentObj.nextParams)
    ? bindID
    : isEmptyArr(mapBody.stmts)
      ? parentObj.nextParams.concat(bindID)
      : mapBody.propagate.concat(bindID)

  const [isFuncCall, isIOCall] = isIOorFuncCall(maybeIOFunc)
  const isIOorFunc = isFuncCall || isIOCall
  if (isIOCall) maybeIOFunc = estemplate.fnCall(maybeIOFunc, [])
  let [ioFunc, , args] = isIOorFunc ? [null, null, null] : maybeIOFunc
  args = Array.isArray(args) ? args : [args]
  const isNewIO =
    notNull(ioFunc) &&
    ioFunc.name === 'IO' &&
    args[0].type === 'CallExpression'
  if (isNewIO) args = createIOBody(args, ioFunc)

  if (isEmptyObj(parentObj)) {
    let val = isIOorFunc
      ? maybeIOFunc
      : estemplate.ioCall(ioFunc, args, nextParams)
    if (isFuncCall) val = val.expression
    val.nextParams = isIOorFunc ? nextParams : val.nextParams
    return ioBodyParser(rest, val, bindBody, mapBody)
  }
  if (!isEmptyArr(mapBody.stmts)) {
    nextParams = parentObj.nextParams.concat(nextParams)
  }
  const cbBody = makeBind(
    isIOorFunc,
    isIOCall,
    maybeIOFunc,
    ioFunc,
    args,
    nextParams
  )
  return formBindStmt(
    cbBody,
    parentObj,
    nextParams,
    rest,
    bindBody,
    mapBody
  )
}

/* letStmtParser in IO */
const letParamIOParser = (input) =>
  parser.all(
    nonReservedIdParser,
    equalSignParser,
    parser.any(maybeDOMStmt, valueParser),
    maybeSpace
  )(input)

const letParamsIOParser = (str, letStmtsArray = [], nextParams = []) =>
  maybe(letParamIOParser(str), (val, rest) => {
    const [id, , literal] = val
    return letParamsIOParser(
      rest,
      letStmtsArray.concat(estemplate.letDecl(id, literal)),
      nextParams.concat(id)
    )
  }) || [[letStmtsArray, nextParams], str]

/*
  Parses let statement inside do blocks of the form
  let var1 = val1, var2 = val2
*/
const maybeLetStmt = (input, parentObj, bindBody, mapBody) =>
  maybe(
    parser.all(letParser, letParamsIOParser)(input),
    (val, rest) => {
      const [, [letDeclarations, propagatedVals]] = val
      mapBody.stmts = mapBody.stmts.concat(letDeclarations)
      mapBody.propagate =
        !isEmptyArr(mapBody.propagate) &&
        mapBody.propagate[0].name === propagatedVals[0].name
          ? mapBody.propagate.concat(propagatedVals.slice(1))
          : mapBody.propagate.concat(propagatedVals)
      return ioBodyParser(rest, parentObj, bindBody, mapBody)
    }
  )

/* letStmtParser ends here */

/* maybe<Val> parser */
const createIfStmt = (left, op, template, right) => (consequent) =>
  estemplate.ifStmt(
    estemplate.binaryExpression(left, op, estemplate[template](right)),
    consequent
  )

const getPredicate = (methodName, value) => {
  const maybeVal = methodName.name.slice(5)
  switch (maybeVal) {
    case 'True':
      return createIfStmt(value, '==', 'boolLiteral', 'true')
    case 'False':
      return createIfStmt(value, '==', 'boolLiteral', 'false')
    case 'Undefined':
      return createIfStmt(value, '==', 'identifier', 'undefined')
    case 'Err':
      return createIfStmt(value, 'instanceof', 'identifier', 'Error')
    case 'Null':
      return createIfStmt(value, '==', 'nullLiteral', 'null')
  }
}

const handlerParser = (input) =>
  maybe(
    parser.all(
      openParensParser,
      parser.any(fnCallParser, ioFuncName, lambdaCallParser),
      closeParensParser
    )(input),
    (val, rest) => {
      const [, val_] = val
      return [val_, rest]
    }
  )

/*
  Parses maybeVal statements of the form
  maybeVal expression1 expression2
  Supported maybe's:
  maybeTrue
  maybeFalse
  maybeUndefined
  maybeErr
  maybeNull
*/
const maybeStmtParser = (input, parentObj, bindBody, mapBody) =>
  maybe(
    parser.all(
      ioMethodNameParser,
      spaceParser,
      expressionParser,
      spaceParser,
      handlerParser
    )(input),
    (val, rest) => maybeStmt(val, rest, parentObj, bindBody, mapBody)
  )

const maybeStmt = (maybeVal, rest, parentObj, bindBody, mapBody) => {
  let [methodName, , value, , handler] = maybeVal
  let handlerBody = handler
  if (Array.isArray(handler)) {
    const [ioFunc, , args] = handler
    handler = ioFunc
    handlerBody = estemplate.defaultIOThen(
      estemplate.ioCall(handler, args)
    )
  }
  const val = getPredicate(methodName, value)(handlerBody)
  mapBody.stmts = mapBody.stmts.concat(val)
  return ioBodyParser(rest, parentObj, bindBody, mapBody)
}
/* maybe<val> parser ends here */

/* Handler function for delete and defineProp */
const makeMap = (parentObj, mapBody) => {
  const nextParams = parentObj.nextParams
  const returnVal = makeReturnArray(
    nextParams.concat(mapBody.propagate)
  )
  const cbBody = makeBlock(mapBody, returnVal)
  const callBack = estemplate.lambda(nextParams, cbBody)
  const val = estemplate.ioMap(parentObj, callBack, nextParams)
  val.nextParams = nextParams.concat(mapBody.propagate)
  return val
}

/* defineProp and delete parsers */
const maybeDefineStmt = (input, parentObj, bindBody, mapBody) =>
  maybe(
    parser.all(
      definePropParser,
      spaceParser,
      parser.any(memberExprParser, nonReservedIdParser),
      spaceParser,
      stringParser,
      spaceParser,
      valueParser
    )(input),
    (val, rest) => {
      const [, , objID, , key, , value] = val
      const definePropTmpl = estemplate.defineProp(
        objID,
        key,
        value,
        true
      )
      mapBody.stmts = mapBody.stmts.concat(definePropTmpl)
      return ioBodyParser(rest, parentObj, bindBody, mapBody)
    }
  )

const maybeDeleteStmt = (input, parentObj, bindBody, mapBody) =>
  maybe(
    parser.all(
      deleteKeywordParser,
      spaceParser,
      parser.any(memberExprParser, nonReservedIdParser)
    )(input),
    (val, rest) => {
      const [deleteKeyword, , objProp] = val
      const deleteTmpl = estemplate.unaryExpression(
        deleteKeyword,
        objProp
      )
      mapBody.stmts = mapBody.stmts.concat(deleteTmpl)
      return ioBodyParser(rest, parentObj, bindBody, mapBody)
    }
  )
/* defineProp and delete ends here */

/* make final statement */
const getCbBody = (bindBody, parentObj) => {
  if (bindBody.length === 0) {
    if (parentObj.type === 'Identifier') {
      return estemplate.fnCall(parentObj, [])
    }
    return parentObj
  }
  const callBack = estemplate.lambda(
    parentObj.nextParams,
    estemplate.array([estemplate.fnCall(bindBody[0], [])])
  )
  const val = estemplate.ioBind(
    parentObj,
    callBack,
    parentObj.nextParams
  )
  val.nextParams = parentObj.nextParams
  return getCbBody(bindBody.slice(1), val)
}

const makeFinalStmt = (input, rest, parentObj, bindBody, mapBody) => {
  if (isEmptyObj(parentObj)) {
    if (isEmptyArr(bindBody)) return null
    parentObj = getCbBody(bindBody.slice(1), bindBody[0])
    const val = estemplate.defaultIOThen(parentObj)
    return [val, rest]
  }
  const cbParams = isUndefined(parentObj.nextParams)
    ? []
    : parentObj.nextParams
  parentObj = getCbBody(bindBody, parentObj)
  const noReturnStmt = isUndefined(parentObj.returnVals)
  const cbBody = noReturnStmt
    ? isEmptyArr(bindBody)
        ? bindBody
        : estemplate.array(bindBody)
    : estemplate.array(parentObj.returnVals)
  let callBack = estemplate.lambda(
    cbParams,
    isEmptyArr(mapBody.stmts) ? cbBody : makeBlock(mapBody, cbBody)
  )
  if (isEmptyArr(mapBody.stmts) && isEmptyArr(cbBody)) {
    callBack = estemplate.lambda([], estemplate.array([]))
  }
  let val
  if (isUndefined(parentObj.returnVals)) {
    val = estemplate.ioThen(parentObj, callBack, cbParams)
  } else {
    if (!isEmptyArr(mapBody.stmts) && !isEmptyArr(cbBody)) {
      const cbExpr =
        callBack.type === 'ArrowFunctionExpression'
          ? callBack.callee
          : callBack.expression
      cbExpr.body = makeBlock(mapBody, estemplate.returnStmt(cbBody))
    }
    val = estemplate.lambda(
      [],
      estemplate.ioMap(parentObj, callBack, cbParams)
    ).expression // need .expression here
  }
  val.sType = 'IO'
  return [val, rest]
}
/* final statement ends here */

const maybeFinalStmt = (
  finalStmt,
  input,
  parentObj,
  bindBody,
  mapBody
) => {
  let [, rest] = finalStmt
  const result = spaceParser(rest)
  if (isNull(result)) {
    return makeFinalStmt(input, rest, parentObj, bindBody, mapBody)
  }
  [, rest] = result
  const maybeReturn = parser.all(
    returnKeywordParser,
    spaceParser,
    argsParser
  )(rest)
  if (notNull(maybeReturn)) {
    [[, , parentObj.returnVals], rest] = maybeReturn
  }
  return ioBodyParser(rest, parentObj, bindBody, mapBody)
}

const maybeFuncCallStmt = (input, parentObj, bindBody, mapBody) =>
  maybe(fnCallParser(input), (fnCall, rest) => {
    mapBody.stmts = mapBody.stmts.concat(fnCall)
    return ioBodyParser(rest, parentObj, bindBody, mapBody)
  })

const maybeIOCallStmt = (maybeIOCall, parentObj, bindBody, mapBody) => {
  const [ioID, rest] = maybeIOCall
  if (isEmptyObj(parentObj)) ioID.nextParams = []
  const val = ioID
  return isEmptyArr(mapBody.stmts)
    ? ioBodyParser(rest, parentObj, bindBody.concat(val), mapBody)
    : ioBodyParser(
      rest,
      makeMap(parentObj, mapBody),
      bindBody.concat(val)
    )
}

/*
  Parses the body of an IO block i.e. expressions after the do keyword
*/
const ioBodyParser = (
  input,
  parentObj = {},
  bindBody = [],
  mapBody = { stmts: [], propagate: [] }
) => {
  const finalStmt = returnParser(input)
  if (notNull(finalStmt)) {
    return maybeFinalStmt(
      finalStmt,
      input,
      parentObj,
      bindBody,
      mapBody
    )
  }

  const bind = maybeBindStmt(input)
  if (notNull(bind)) {
    return bindStmt(bind, parentObj, bindBody, mapBody)
  }

  if (!isEmptyObj(parentObj)) {
    const val = parser.any(
      maybeDefineStmt,
      maybeDeleteStmt,
      maybeLetStmt,
      maybeStmtParser,
      maybeFuncCallStmt
    )(input, parentObj, bindBody, mapBody)
    if (val !== null) return val
  }

  const ioStmt = ioStmtParser(input, parentObj, mapBody)
  if (notNull(ioStmt)) {
    return ioBodyParser(ioStmt[1], ioStmt[0], bindBody)
  }

  const ioCall = nonReservedIdParser(input)
  if (notNull(ioCall)) {
    return maybeIOCallStmt(ioCall, parentObj, bindBody, mapBody)
  }

  return null
}

const ioDecl = (isId, maybeDo, doID, input, rest) => {
  let ioBody
  if (maybeDo === 'do') {
    const result = ioBodyParser(rest)
    if (isNull(result)) {
      return null
    }
    [ioBody, rest] = result
    ioBody.expression = false
  } else {
    maybeDo = isId ? estemplate.fnCall(maybeDo, []) : maybeDo
    ioBody = estemplate.defaultIOThen(maybeDo)
  }
  ioBody.sType = 'IO'
  const val = estemplate.declaration(doID, ioBody)
  return [val, rest]
}

const ioParser = (input) =>
  maybe(
    parser.all(
      nonReservedIdParser,
      equalSignParser,
      parser.any(
        doParser,
        noArgsCallParser,
        ioStmtParser,
        nonReservedIdParser
      )
    )(input),
    (initIO, rest) => {
      const [doID, , maybeDo] = initIO
      const isId =
        notUndefined(maybeDo.type) && maybeDo.type === 'Identifier'
      const idNotMain = isId && doID.name !== 'main'
      if (idNotMain) return null
      const isFunc =
        notUndefined(maybeDo.type) && maybeDo.type === 'CallExpression'
      const funcNotMain = isFunc && doID.name !== 'main'
      if (funcNotMain) {
        const val = maybeDo
        val.sType = 'IO'
        return [estemplate.declaration(doID, val), rest]
      }
      return ioDecl(isId, maybeDo, doID, input, rest)
    }
  )
/* IO ends here */

const expressionParser = (input) =>
  parser.any(
    parenthesesParser,
    unaryExprParser,
    lambdaCallParser,
    lambdaParser,
    letExpressionParser,
    ifExprParser,
    memberExprParser,
    arrayParser,
    objectParser,
    booleanParser,
    nonReservedIdParser,
    numberParser,
    nullParser,
    stringParser,
    regexParser
  )(input)

const parenthesesParser = (input) =>
  maybe(
    parser.all(
      openParensParser,
      maybeNewLineAndIndent,
      valueParser,
      maybeNewLineAndIndent,
      closeParensParser
    )(input),
    (val, rest) => {
      const [, , val_] = val
      return [val_, rest]
    }
  )

const whereClauseParser = (input) => {
  const whereDeclarations = []
  const whereParsed = whereParser(input)
  if (!whereParsed) {
    return null
  }
  const [, rest] = whereParsed
  const whereDeclCol = rest.column
  input = rest
  do {
    const declParsed = maybe(
      parser.all(
        parser.any(declParser, fnDeclParser, fnWithGuardsParser),
        maybeNewLineAndIndent
      )(input),
      (val, rest) => {
        const [decl] = val
        return [decl, rest]
      }
    )
    if (!declParsed) {
      break
    }
    whereDeclarations.push(declParsed[0])
    input = declParsed[1]
  } while (input.column === whereDeclCol)
  return [whereDeclarations, input]
}

const valueAndWhereClauseParser = (input) =>
  maybe(
    parser.all(
      valueParser,
      maybeNewLineAndIndent,
      whereClauseParser
    )(input),
    (val, rest) => {
      const [v, , whereDecls] = val
      const block = estemplate.blockStmt([])
      const nonReturnStatements = ['IfStatement']
      block.body = [
        ...whereDecls,
        nonReturnStatements.includes(v.type)
          ? v
          : estemplate.returnStmt(v)
      ]
      return [block, rest]
    }
  )

const valueParser = (input) =>
  parser.any(
    binaryExprParser,
    fnCallParser,
    lambdaCallParser,
    expressionParser,
    guardsParser
  )(input)

const declParser = (input) =>
  maybe(
    parser.all(
      nonReservedIdParser,
      equalSignParser,
      parser.any(valueAndWhereClauseParser, valueParser)
    )(input),
    (val, rest) => {
      const [id, , value] = val
      return [
        nonExprStatements.includes(value.type)
          ? estemplate.declaration(
              id,
              estemplate.lambdaCall([], [], value)
            )
          : estemplate.declaration(id, value),
        rest
      ]
    }
  )

/* Helper for fnDeclParser */
const funcParamsParser = (input, paramArray = []) =>
  maybe(
    parser.all(
      spaceParser,
      parser.any(
        arrayParser,
        objectParser,
        nonReservedIdParser,
        numberParser,
        nullParser,
        stringParser
      )
    )(input),
    (val, rest) => {
      const [, param] = val
      return funcParamsParser(rest, paramArray.concat(param))
    }
  ) || [paramArray, input]

const combineGuards = (guards) => {
  if (!guards.length) return null
  let combinedGuards = guards[guards.length - 1]
  for (let i = guards.length - 2; i >= 0; i--) {
    guards[i].alternate = combinedGuards
    combinedGuards = guards[i]
  }
  return combinedGuards
}

const guardsParser = (input) => {
  const guards = []
  let guardParsed
  do {
    guardParsed = maybe(
      parser.all(
        maybeNewLineAndIndent,
        vBarParser,
        binaryExprParser,
        equalSignParser,
        valueParser
      )(input),
      (val, rest) => {
        const [, , predicate, , consequent] = val
        return [estemplate.ifStmt(predicate, consequent, true), rest]
      }
    )
    if (guardParsed) {
      guards.push(guardParsed[0])
      input = guardParsed[1]
    }
  } while (guardParsed)
  const defaultCase = maybe(
    parser.all(
      maybeNewLineAndIndent,
      vBarParser,
      otherwiseParser,
      equalSignParser,
      valueParser
    )(input),
    (val, rest) => {
      const [, , , , defaultCase] = val
      return [
        estemplate.ifStmt(
          estemplate.boolLiteral('true'),
          defaultCase,
          true
        ),
        rest
      ]
    }
  )
  if (defaultCase) {
    guards.push(defaultCase[0])
    const rest = defaultCase[1]
    return [combineGuards(guards), rest]
  } else if (guards.length) {
    return [combineGuards(guards), input]
  }
  return null
}

const fnDeclParser = (input) =>
  maybe(
    parser.all(
      nonReservedIdParser,
      funcParamsParser,
      equalSignParser,
      parser.any(valueAndWhereClauseParser, valueParser)
    )(input),
    (val, rest) => {
      const [funcID, paramsArr, , body] = val
      return [
        estemplate.funcDeclaration(funcID, paramsArr, body),
        rest
      ]
    }
  )

const fnWithGuardsParser = (input) => {
  return maybe(
    parser.all(
      nonReservedIdFnCallParser,
      funcParamsParser,
      maybeNewLineAndIndent,
      parser.any(valueAndWhereClauseParser, valueParser)
    )(input),
    (val, rest) => {
      const [funcID, paramsArr, , body] = val
      return [
        estemplate.funcDeclaration(
          funcID,
          paramsArr,
          nonExprStatements.includes(body.type)
            ? body
            : estemplate.blockStmt([body])
        ),
        rest
      ]
    }
  )
}

const statementParser = (input) =>
  parser.any(
    multiLineCommentParser,
    singleLineCommentParser,
    returnParser,
    doBlockParser,
    ioParser,
    doFuncParser,
    declParser,
    ifExprParser,
    fnDeclParser,
    fnWithGuardsParser,
    defineStmtParser,
    fnCallParser,
    lambdaParser,
    lambdaCallParser,
    spaceParser
  )(input)

const makeErrorObj = (errObj) => {
  errObj.error = true
  const len = errObj.regex.length - 1
  const defaultMsg = errorMsg.default + ': ' + errObj.str
  const regexName = isUndefined(errObj.regex[len])
    ? defaultMsg
    : errObj.regex[len]
  const errorText = isUndefined(errorMsg[regexName])
    ? defaultMsg
    : errorMsg[regexName]
  errObj.msg = errorText
  delete errObj.regex
  return errObj
}

const programParser = (input, ast = estemplate.ast()) => {
  const result = statementParser(input)
  if (isNull(result)) {
    const errObj = JSON.parse(JSON.stringify(parser.unParsed))
    parser.unParsed = { line: 1, column: 0, regex: [], error: false }
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
