/*
  Parser
  Parses clean source. Generates clean AST.
*/
const opPrec = require('./operatorPrecedence')
const estemplate = require('./estemplate')
const updateAst = require('./astupdate')
const parser = require('./parserObject')
const base = require('./basicParsers')
const utils = require('./utilityFunctions')
/* Utility Functions */
const {
  mayBe,
  returnRest,
  isEmptyObj
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
  reverseBindParser, doParser, mainParser, putLineParser
} = base

const valueParser = input => parser.any(objectParser, binaryExprParser, unaryExprParser, letExpressionParser,
                                        ifExprParser, fnCallParser, arrayParser, memberExprParser,
                                        expressionParser)(input)

const parenthesisParser = input => {
  let result = parser.all(
    openParensParser, mayBeNewLineAndIndent,
    parser.any(letExpressionParser, ifExprParser, binaryExprParser, fnCallParser, expressionParser),
    mayBeNewLineAndIndent, closeParensParser
  )(input)

  if (result === null) return null
  let [[, , val], rest] = result
  return returnRest(val, input, rest.str)
}

const expressionParser = input => parser.any(lambdaParser, lambdaCallParser, memberExprParser, arrayParser, objectParser, parenthesisParser, booleanParser, identifierParser, numberParser, nullParser, stringParser)(input)

const unaryExprParser = parser.bind(
  parser.bind(
    unaryOperatorParser,
    operator => rest => operator === ':type'
      ? spaceParser(rest) !== null ? ['typeof', spaceParser(rest)[1]] : null
      : [operator, rest]),
  operator => rest => mayBe(expressionParser(rest),
    (argument, rest) => [estemplate.unaryExpression(operator, argument), rest])
)

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
  return [estemplate.lambdaCall(params, argsArr, body), rest]
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

const bindStatementParser = input => parser.all(identifierParser, spaceParser, reverseBindParser, identifierParser, mayBeSpace, valueParser, mayBeNewLineAndIndent)(input)

const letStmtParser = input => {
  let result = parser.all(letParser, letParamsParser, mayBeNewLineAndIndent)(input)
  if (result === null) return null
  let [[, [idArray, valArray]], rest] = result
  return returnRest([idArray, valArray], input, rest.str)
}

const makeMapChain = (idArray, valArray, parentObj) => {
  if (idArray.length === 0 && valArray.length === 0) return parentObj
  let cbParams = parentObj.nextParams
  let cbBody = estemplate.blockStmt([estemplate.returnStmt([valArray[0]].concat(cbParams))])
  let nextParams = [idArray[0]].concat(cbParams)
  let callBack = estemplate.lambda(cbParams, cbBody)
  let nextParent = estemplate.ioMap(parentObj, callBack, nextParams)
  return makeMapChain(idArray.slice(1), valArray.slice(1), nextParent)
}

const putLineStmtParser = (input, parentObj) => {
  let result = parser.all(putLineParser, spaceParser, argsParser)(input)
  if (result === null) return null
  let [[, , args], rest] = result
  let val = estemplate.ioPutLine(parentObj, args, parentObj.nextParams)
  return returnRest(val, input, rest.str)
}

const getIOBody = (input, parentObj = {}) => {
  let finalStmt = returnParser(input)
  if (finalStmt !== null) {
    let [, rest] = finalStmt
    let result = spaceParser(rest)
    if (result === null) {
      let val = parentObj
      return returnRest(val, input, rest.str)
    }
    let [, _rest] = result
    return getIOBody(_rest, parentObj)
  }

  let mayBeBind = bindStatementParser(input)
  if (mayBeBind !== null) {
    let [[bindID, , , ioFunc, , arg], rest] = mayBeBind
    let nextParams = parentObj.nextParams.concat(bindID)
    let [cbBody, cbParams] = [estemplate.ioCall(ioFunc, arg, nextParams), parentObj.nextParams]
    let callBack = estemplate.lambda(cbParams, cbBody)
    return getIOBody(rest, estemplate.ioBind(parentObj, callBack, nextParams))
  }
  let mayBeLet = letStmtParser(input)
  if (mayBeLet !== null) {
    let [[idArray, valArray], rest] = mayBeLet
    let mapChain = makeMapChain(idArray, valArray, parentObj)
    return getIOBody(rest, mapChain)
  }

  let mayBePutLine = putLineStmtParser(input, parentObj)
  if (mayBePutLine !== null) {
    let [val, rest] = mayBePutLine
    return getIOBody(rest, val)
  }

  return null
}

const ioParser = input => {
  let initIO = parser.all(identifierParser, equalSignParser, doParser, mayBeNewLineAndIndent, bindStatementParser)(input)
  if (initIO === null) return null
  let [[doID, , , , [bindID, , , ioFunc, , arg]], rest] = initIO
  let result = getIOBody(rest, estemplate.ioCall(ioFunc, arg, [bindID]))
  if (result === null) return null
  let [ioBody, _rest] = result
  ioBody.expression = false
  let returnedIO = estemplate.returnStmt(ioBody)
  returnedIO.argument = ioBody
  ioBody = estemplate.blockStmt([returnedIO])
  return returnRest(estemplate.funcDeclaration(doID, [], ioBody), input, _rest.str)
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
  let parentObj = parser.any(arrayParser, identifierParser, parenthesisParser)(input)
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
        return returnRest(estemplate.fnCall(id, args), input, rest.str)
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

const ioChainParser = (input, ioChain = {}) => {
  let fin = returnParser(input)
  if (fin !== null) {
    let [, rest] = fin
    let result = spaceParser(rest)
    if (result === null) {
      let ioBlock = estemplate.defaultIOThen(ioChain)
      return returnRest(ioBlock, input, rest.str)
    }
    return ioChainParser(rest, ioChain)
  }

  if (isEmptyObj(ioChain)) {
    let mayBeCallee = identifierParser(input)
    if (mayBeCallee !== null) {
      let [callee, rest] = mayBeCallee
      ioChain = estemplate.fnCall(callee, [])
      return ioChainParser(rest, ioChain)
    }
  }

  let mayBeIOCall = parser.all(mayBeNewLineAndIndent, identifierParser)(input)
  if (mayBeIOCall !== null) {
    let [[, val], rest] = mayBeIOCall
    ioChain = estemplate.ioBind(ioChain, val)
    return ioChainParser(rest, ioChain)
  }
  return null
}

const mainStmtParser = input => {
  let result = parser.all(mainParser, equalSignParser, doParser, mayBeNewLineAndIndent, ioChainParser)(input)
  if (result === null) return null
  let [[, , , , ioChain], rest] = result
  return returnRest(ioChain, input, rest.str)
}

const statementParser = input => parser.any(multiLineCommentParser, singleLineCommentParser, returnParser, ioParser, declParser, ifExprParser, fnDeclParser, fnCallParser, lambdaParser, lambdaCallParser)(input)

const programParser = (input, ast = estemplate.ast()) => {
  let [, rest] = returnRest('', input, input.str)
  let result = statementParser(rest)
  if (result === null) {
    if (input.str === '') return updateAst(ast)
    let err = new SyntaxError(`\n\n${input.str}\n ...at line: ${input.line}`)
    let mayBeMain = mainStmtParser(input)
    if (mayBeMain === null) return err
    ast.body.push(mayBeMain[0])
    return updateAst(ast)
  }
  if (typeof result[0] !== 'string') ast.body.push(result[0])
  return programParser(result[1], ast)
}

/* helper functions for binaryExprParser */
const precedence = operator => opPrec[operator].prec
const associativity = operator => opPrec[operator].assoc
const current = input => {
  return input.str.startsWith('//') || input.str.startsWith('/*') ? null
    : parser.any(unaryExprParser, binaryOperatorParser, spaceParser, fnCallParser, expressionParser)(input)
}
const isBinaryOperator = token => opPrec[token] !== undefined
const isExpression = token => token.type !== undefined
const isBinary = val => val !== null && ((val.type === 'BinaryExpression' && val.left !== undefined && val.right !== undefined) || (val.isPower !== undefined && val.isPower))

const binaryExprParser = src => {
  let opStack = ['$']
  let operandStack = []
  let biExpr = estemplate.binaryExpression
  let descender = s => {
    let currentToken = current(s)
    let [token, rest] = currentToken === null ? [null, s] : currentToken
    let topOfOpStack = opStack[opStack.length - 1]

    if (token === null) {
      if (topOfOpStack !== '$') {
        let [rightOperand, operator, leftOperand] = [operandStack.pop(), opStack.pop(), operandStack.pop()]
        operandStack.push(biExpr(leftOperand, operator, rightOperand))
        return descender(rest)
      }
      return operandStack.length === 0 && opStack.length === 1 ? null : [operandStack.pop(), rest]
    }

    if (isExpression(token)) {
      operandStack.push(token)
      return descender(rest)
    }
    if (isBinaryOperator(token)) { // check operator stack
      if (precedence(token) > precedence(topOfOpStack)) {
        opStack.push(token)
        return descender(rest)
      }

      if (precedence(token) < precedence(topOfOpStack)) {
        let [rightOperand, operator, leftOperand] = [operandStack.pop(), opStack.pop(), operandStack.pop()]
        operandStack.push(biExpr(leftOperand, operator, rightOperand))
        opStack.push(token)
        return descender(rest)
      }
      if (associativity(token) === associativity(topOfOpStack)) {
        if (associativity(token) === 'R') {
          opStack.push(token)
          return descender(rest)
        }
        let [rightOperand, operator, leftOperand] = [operandStack.pop(), opStack.pop(), operandStack.pop()]
        operandStack.push(biExpr(leftOperand, operator, rightOperand))
        opStack.push(token)
        return descender(rest)
      }
    }
    return descender(rest)
  }
  let result = descender(src)
  if (result === null) return null
  let [val, rest] = result
  return isBinary(val) ? [val, rest] : null
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
  if (!(closeSquareBracket = closeSquareBracketParser(arrayPropsRest))) return null
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
  if (!(closeCurlyResult = closeCurlyBraceParser(objPropsRest[1]))) return null
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
