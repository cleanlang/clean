/*
  Parser
  Parses clean source. Generates clean AST.
*/
const languageConstruct = require('./languageConstructs')
const opPrec = require('./operatorPrecedence')
const estemplate = require('./estemplate')
const updateAst = require('./astupdate')

/*  Utility functions  */
const mayBe = (value, func) => value === null ? null : func(...value)
const parenCheck = src => mayBe(parser.regex(/^(\))((.|\n)*)$/)(src),
                              (m, val, rest) => returnRest(val, src, src.str))
const isLanguageConstruct = id => languageConstruct[id]
const unescape = str => str.replace(/(^')/, '').replace(/('$)/, '').replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r').replace(/\\'/g, '\'')

const returnRest = (val, input, rest, field) => {
  let output = JSON.parse(JSON.stringify(input))
  if (field) {
    let value = field.value
    switch (field.name) {
      case 'indent':
        output.indent = value
        output.column = value
        break
      case 'return':
        output.column = 0
        output.line += value
        break
      case 'column':
        output.column += value
        break
    }
  }
  output.str = rest
  val.cursorLoc = {line: output.line, column: output.column}
  return [val, output]
}

/*  Predefined regexes */
const spaceRegex = /^([ \t]+)((.|\n)*)$/
const returnRegex = /^(\n)((.|\n)*)$/
const idRegex = /^([a-zA-Z]+[a-zA-Z0-9_]*)((.|\n)*)$/
const numRegex = /^((?:\d+(?:\.\d*)?|\.\d+)(?:[e][+-]?\d+)?)((.|\n)*)$/
const boolRegex = /^(true|false)((.|\n)*)$/i
const stringRegex = /^('[^\\']*(?:\\.[^\\']*)*')((.|\n)*)$/
const binaryOperatorRegex = /^(\+\+|\+|-|%|\/|\*|<<|<=|<|>>>|>>|>=|>|&&|&|\|\||\||\^|==|!=)((.|\n)*)$/
const unaryOperatorRegex = /^(:type|-|!)((.|\n)*)$/
const openCurlyRegex = /^({)((.|\n)*)$/
const closeCurlyRegex = /^(})((.|\n)*)$/
const openSquareBracketRegex = /^(\[)((.|\n)*)$/
const closeSquareBracketRegex = /^(])((.|\n)*)$/
const openParensRegex = /^(\()((.|\n)*)$/
const closeParensRegex = /^(\))((.|\n)*)$/
const commaRegex = /^(,)((.|\n)*)$/
const colonRegex = /^(:)((.|\n)*)$/
const singleLineCommentRegex = /^((\/\/)(.*)(\n))((.|\n)*)$/
const multiLineCommentRegex = /^((\/\*)((.|\n)*?)(\*\/))((.|\n)*)$/

/*
  Parser factory. Used to create parsers
  parser.regex - creates parser for given regex
  parser.bind - applies monadic bind on parsers
  parser.all - All parsers supplied MUST match
  parser.any - ANY ONE of the parsers need match
*/

const parser = {}

parser.regex = regex => src => mayBe(
  regex.exec(src.str),
  (m, val, rest) => returnRest(val, src, rest, {'name': 'column', 'value': val.length})
)

parser.bind = (mv, mf) => input => mayBe(
  mv(input),
  (val, rest) => mf(val)(rest)
)

parser.all = (...parsers) => src => {
  let rest = src
  let values = []
  for (let parser of parsers) {
    let result = parser(rest)
    if (result === null) return null
    values.push(result[0])
    rest = result[1]
  }
  return [values, rest]
}

parser.any = (...parsers) => src => {
  for (let parser of parsers) {
    let result = parser(src)
    if (result !== null) return result
  }
  return null
}

/*
  All required parsers are created below
*/
const spaceParser = parser.regex(spaceRegex)

const equalSignParser = parser.regex(/^(\s+=\s+)((.|\n)*)$/)

const thinArrowParser = parser.regex(/^(\s*->\s+)((.|\n)*)$/)

const slashParser = parser.regex(/^(\s*\\)((.|\n)*)$/)

const letParser = parser.regex(/^(\s*let\s+)((.|\n)*)$/)

const inParser = parser.regex(/^(\s*in\s+)((.|\n)*)$/)

const dotParser = parser.regex(/^(\.)((.|\n)*)$/)

const ifParser = parser.regex(/^(if\s+)((.|\n)*)$/)
const thenParser = parser.regex(/^(then\s+)((.|\n)*)$/)
const elseParser = parser.regex(/^(else\s+)((.|\n)*)$/)

const indentParser = input => mayBe(
  spaceRegex.exec(input),
  (a, space, rest) => [space, rest]
)

const returnParser = input => mayBe(
  returnRegex.exec(input.str),
  (a, newLine, rest) => returnRest(newLine, input, rest, {'name': 'return', 'value': newLine.length})
)

const numberParser = input => mayBe(
  numRegex.exec(input.str),
  (a, num, rest) => returnRest(estemplate.literal(num, num), input, rest, {'name': 'column', 'value': num.length})
)

const identifierParser = input => mayBe(
  idRegex.exec(input.str),
  (a, name, rest) => isLanguageConstruct(name) ? null : returnRest(estemplate.identifier(name), input, rest, {'name': 'column', 'value': name.length})
)

const stringParser = input => mayBe(
  stringRegex.exec(input.str),
  (a, string, rest) => returnRest(estemplate.stringLiteral(unescape(string)),
                                    input, rest, {'name': 'column', 'value': string.length})
)

const booleanParser = input => mayBe(
    boolRegex.exec(input.str),
    (a, bool, rest) => returnRest(estemplate.boolLiteral(bool), input, rest, {'name': 'column', 'value': bool.length})
  )

const openParensParser = input => mayBe(
  openParensRegex.exec(input.str),
  (a, openParens, rest) => returnRest(openParens, input, rest, {'name': 'column', 'value': 1})
)

const closeParensParser = input => mayBe(
  closeParensRegex.exec(input.str),
  (a, closeParens, rest) => returnRest(closeParens, input, rest, {'name': 'column', 'value': 1})
)

const openCurlyBraceParser = input => mayBe(
  openCurlyRegex.exec(input.str),
  (a, openCurlyBrace, rest) => returnRest(openCurlyBrace, input, rest, {'name': 'column', 'value': openCurlyBrace.length})
)

const closeCurlyBraceParser = input => mayBe(
  closeCurlyRegex.exec(input.str),
  (a, closeCurlyBrace, rest) => returnRest(closeCurlyBrace, input, rest, {'name': 'column', 'value': closeCurlyBrace.length})
)

const openSquareBracketParser = input => mayBe(
  openSquareBracketRegex.exec(input.str),
  (a, openSquareBracket, rest) => returnRest(openSquareBracket, input, rest, {'name': 'column', 'value': openSquareBracket.length})
)

const closeSquareBracketParser = input => mayBe(
  closeSquareBracketRegex.exec(input.str),
  (a, closeSquareBracket, rest) => returnRest(closeSquareBracket, input, rest, {'name': 'column', 'value': closeSquareBracket.length})
)

const commaParser = input => mayBe(
  commaRegex.exec(input.str),
  (a, comma, rest) => returnRest(comma, input, rest, {'name': 'column', 'value': comma.length})
)

const colonParser = input => mayBe(
  colonRegex.exec(input.str),
  (a, colon, rest) => returnRest(colon, input, rest, {'name': 'column', 'value': colon.length})
)

const singleLineCommentParser = input => mayBe(
  singleLineCommentRegex.exec(input.str),
  (a, comment, b, c, d, rest) => {
    let val = comment.slice(2, comment.length - 1)
    return returnRest(estemplate.comment('Line', val), input, rest, {'name': 'return', 'value': 1})
  }
)

const multiLineCommentParser = input => mayBe(
  multiLineCommentRegex.exec(input.str),
  (a, comment, b, c, d, e, rest) => {
    let lineCount = comment.match(/\n/g) === null ? 0 : comment.match(/\n/g).length
    let val = comment.slice(2, comment.length - 2)
    return returnRest(estemplate.comment('Block', val), input, rest, {'name': 'return', 'value': lineCount})
  }
)

const declValueParser = input => parser.any(unaryExprParser, letExpressionParser, ifExprParser,
  binaryExprParser, fnCallParser, memberExprParser,
  arrayParser, objectParser, expressionParser)(input)

const parenthesisParser = input => {
  let result = parser.all(
    openParensParser, mayBeSpace,
    parser.any(letExpressionParser, ifExprParser, binaryExprParser, fnCallParser, expressionParser),
    mayBeSpace, closeParensParser
  )(input)

  if (result === null) return null
  let [[, , val], rest] = result
  return returnRest(val, input, rest.str)
}

const expressionParser = input => parser.any(memberExprParser, arrayParser, objectParser, parenthesisParser, booleanParser, identifierParser, numberParser, stringParser)(input)

const unaryOperatorParser = input => mayBe(
    unaryOperatorRegex.exec(input.str),
    (m, operator, rest) => returnRest(operator, input, rest, {'name': 'column', 'value': operator.length})
  )

const unaryExprParser = parser.bind(
  parser.bind(
    unaryOperatorParser,
    operator => rest => operator === ':type'
      ? spaceParser(rest) !== null ? ['typeof', spaceParser(rest)[1]] : null
      : [operator, rest]),
  operator => rest => mayBe(expressionParser(rest),
    (argument, rest) => [estemplate.unaryExpression(operator, argument), rest])
)

const binaryOperatorParser = parser.regex(binaryOperatorRegex)

const declParser = parser.bind(
  parser.bind(
    identifierParser,
    val => input => mayBe(
        equalSignParser(input),
        (v, rest) => [val, rest]
      )
  ),
  val => input => mayBe(
    declValueParser(input),
        (v, rest) => {
          return returnRest(estemplate.declaration(val, v), input, rest.str)
        }
      )
)

const paramParser = input => parser.all(spaceParser, parser.any(identifierParser, numberParser, stringParser))(input)

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
    parser.any(unaryExprParser, letExpressionParser, ifExprParser, binaryExprParser, fnCallParser, expressionParser)(input),
      (body, rest) => {
        val.declarations[0].init.body = body
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
     expressionParser(input),
     (body, rest) => {
       val.expression.body = body
       return returnRest(val, input, rest.str)
     }
   )
 )

const letParamParser = input => parser.all(identifierParser, equalSignParser, declValueParser, mayBeSpace)(input)

const letParamsParser = (str, letIdArray = [], letLiteralArray = []) => {
  let param = letParamParser(str)
  if (param !== null) {
    let [[id,, literal], rest] = param
    return letParamsParser(rest, letIdArray.concat(id), letLiteralArray.concat(literal))
  }
  return [letIdArray, letLiteralArray, str]
}

const letExpressionParser = parser.bind(
  parser.bind(
    parser.bind(
      letParser,
      val => input => mayBe(
          letParamsParser(input),
          (val1, val2, rest) => returnRest(estemplate.letExpression(val1, val2), input, rest.str)
       )
    ),
    val => input => mayBe(
        inParser(input),
        (v, rest) => returnRest(val, input, rest.str)
      )
  ),
  val => input => mayBe(
    declValueParser(input),
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
  if (exp.type === 'Identifier') return formMemberExpression(rest, estemplate.memberExpression(obj, exp))
  return formMemberExpression(rest, obj)
}

const memberExprParser = input => {
  let parentObj = parser.any(arrayParser, identifierParser)(input)
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
    parser.any(objectParser, unaryExprParser, expressionParser),
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
    ifParser, parser.any(binaryExprParser, fnCallParser, expressionParser),
    mayBeSpace, thenParser, parser.any(binaryExprParser, fnCallParser, expressionParser),
    mayBeSpace, elseParser, parser.any(binaryExprParser, fnCallParser, expressionParser))(input),
    (val, rest) => {
      let [, condition, , , consequent, , , alternate] = val
      return returnRest(estemplate.ifthenelse(condition, consequent, alternate), input, rest.str)
    }
)
const multiLineParser = src => {
  if (src.length < 2) return src
  if (!indentParser(src[1])) return src
  let lead = src.splice(0, 1)
  let follow = src.splice(0, 1)
  src.unshift(lead + follow)
  return multiLineParser(src)
}

const statementParser = input => parser.any(multiLineCommentParser, singleLineCommentParser, returnParser, declParser, ifExprParser, fnDeclParser, fnCallParser, lambdaParser)(input)

const programParser = (input, ast = estemplate.ast()) => {
  let result = statementParser(returnRest('', input, multiLineParser(input.str.split('\n')).join('\n'))[1])
  if (result === null) return updateAst(ast)
  if (typeof result[0] !== 'string') ast.body.push(result[0])
  return programParser(result[1], ast)
}

/* helper functions for binaryExprParser */
const precedence = operator => opPrec[operator].prec
const associativity = operator => opPrec[operator].assoc
const current = input => parser.any(unaryExprParser, binaryOperatorParser, spaceParser, fnCallParser, expressionParser)(input)
const isBinaryOperator = token => opPrec[token] !== undefined
const isExpression = token => token.type !== undefined
const isBinary = val => val !== null && val.type === 'BinaryExpression' && val.left !== undefined && val.right !== undefined

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
const valueParser = input => parser.any(unaryExprParser, expressionParser, arrayParser, objectParser)(input)

const arrayElemParser = input => mayBe(
  parser.all(mayBeSpace, valueParser, mayBeSpace)(input),
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

  if (result === null) {
    return commaCheck(input, propArr)
  }

  if (result === null) return [propArr, input]
  let [val, rest] = result
  propArr.push(val)

  let comma = commaParser(rest)
  if (comma === null) {
    return [propArr, rest]
  }
  [, rest] = comma
  return arrayElemsParser(rest, propArr)
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

const mayBeSpace = input => {
  let val = ''
  let space = spaceParser(input)
  let rest = input
  if (space !== null) {
    [val, rest] = space
  }
  return returnRest(val, input, rest.str, {name: 'column', value: val.length})
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
  parser.all(mayBeSpace, keyParser, mayBeSpace, colonParser,
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
