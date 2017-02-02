/*
  Parser
  Parses clean source. Generates clean AST.
*/
const opPrec = require('./operatorPrecedence')
const estemplate = require('./estemplate')
const updateAst = require('./astupdate')

/*  Utility functions  */
const mayBe = (value, func) => value === null ? null : func(...value)
const parenCheck = src => mayBe(parser.regex(/^(\))((.|\n)*)$/)(src),
                              (m, val, rest) => returnRest(val, src, src.str))

const returnRest = (val, input, rest, field) => {
  const output = JSON.parse(JSON.stringify(input))
  if (field) {
    let value = field.value
    switch (field.name) {
      case 'indent':
        output.indent = value
        output.column = value
        break
      case 'return':
        output.column = 1
        output.line += value
        break
      case 'column':
        output.column += value
        break
    }
  }
  output.str = rest
  return [val, output]
}

/*  Predefined regexes */
const spaceRegex = /^( +)((.|\n)*)$/
const returnRegex = /^(\n)((.|\n)*)$/
const idRegex = /^([a-zA-Z]+[a-zA-Z0-9_]*)((.|\n)*)$/
const numRegex = /^((?:\d+(?:\.\d*)?|\.\d+)(?:[e][+-]?\d+)?)((.|\n)*)$/
const boolRegex = /^(true|false)((.|\n)*)$/i
const stringRegex = /^('[^\\']*(?:\\.[^\\']*)*')((.|\n)*)$/
const binaryOperatorRegex = /^(\+|-|\/|\*|<<|<=|<|>>>|>>|>=|>|&&|&|\|\||\||\^|==)((.|\n)*)$/
const unaryOperatorRegex = /^(:type|-|!)((.|\n)*)$/
const openCurlyRegex = /^({)((.|\n)*)$/
const closeCurlyRegex = /^(})((.|\n)*)$/
const commaRegex = /^(,)((.|\n)*)$/
const colonRegex = /^(:)((.|\n)*)$/

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
  var rest = src
  var values = []
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
var spaceParser = parser.regex(spaceRegex)

var equalSignParser = parser.regex(/^(\s+=\s+)((.|\n)*)$/)

var thinArrowParser = parser.regex(/^(\s*->\s+)((.|\n)*)$/)

var slashParser = parser.regex(/^(\s*\\)((.|\n)*)$/)

var letParser = parser.regex(/^(\s*let\s+)((.|\n)*)$/)

var inParser = parser.regex(/^(\s*in\s+)((.|\n)*)$/)

var dotParser = parser.regex(/^(\.)((.|\n)*)$/)

var ifParser = parser.regex(/^(if\s+)((.|\n)*)$/)
var thenParser = parser.regex(/^(then\s+)((.|\n)*)$/)
var elseParser = parser.regex(/^(else\s+)((.|\n)*)$/)

var indentParser = input => mayBe(
  spaceRegex.exec(input),
  (a, space, rest) => [space, rest]
)

var returnParser = input => mayBe(
  returnRegex.exec(input.str),
  (a, newLine, rest) => returnRest(newLine, input, rest, {'name': 'return', 'value': newLine.length})
)

var numberParser = input => mayBe(
  numRegex.exec(input.str),
  (a, num, rest) => returnRest(estemplate.literal(num, num), input, rest, {'name': 'column', 'value': num.length})
)

var identifierParser = input => mayBe(
  idRegex.exec(input.str),
  (a, name, rest) => returnRest(estemplate.identifier(name), input, rest, {'name': 'column', 'value': name.length})
)

var stringParser = input => mayBe(
  stringRegex.exec(input.str),
  (a, string, rest) => returnRest(estemplate.stringLiteral(string.replace(/(^')/, '').replace(/('$)/, '')),
                                    input, rest, {'name': 'column', 'value': string.length})
)

var booleanParser = input => mayBe(
    boolRegex.exec(input.str),
    (a, bool, rest) => returnRest(estemplate.boolLiteral(bool), input, rest, {'name': 'column', 'value': bool.length})
  )

var openCurlyBraceParser = input => mayBe(
  openCurlyRegex.exec(input.str),
  (a, openCurlyBrace, rest) => returnRest(openCurlyBrace, input, rest, {'name': 'column', 'value': openCurlyBrace.length})
)

var closeCurlyBraceParser = input => mayBe(
  closeCurlyRegex.exec(input.str),
  (a, closeCurlyBrace, rest) => returnRest(closeCurlyBrace, input, rest, {'name': 'column', 'value': closeCurlyBrace.length})
)

var commaParser = input => mayBe(
  commaRegex.exec(input.str),
  (a, comma, rest) => returnRest(comma, input, rest, {'name': 'column', 'value': comma.length})
)

var colonParser = input => mayBe(
  colonRegex.exec(input.str),
  (a, colon, rest) => returnRest(colon, input, rest, {'name': 'column', 'value': colon.length})
)

var parenthesisParser = parser.bind(
  parser.bind(
  parser.bind(
  parser.bind(
    input => input.str.startsWith('(')
      ? returnRest('(', input, input.str.substr(1), {'name': 'column', 'value': 1})
      : null,
    val => input => {
      const space = spaceParser(input)
      return space ? [space[0], space[1]] : [null, input]
    }),
    val => input => mayBe(
      parser.any(ifExprParser, binaryExprParser, fnCallParser, expressionParser, unaryExprParser)(input),
      (v, rest) => returnRest(v, input, rest.str)
    )),
    val => input => {
      var space = spaceParser(input)
      return space ? [val, space[1]] : [val, input]
    }),
    val => input => input.str.startsWith(')')
      ? returnRest(val, input, input.str.substr(1), {'name': 'column', 'value': 1})
      : null
)

var expressionParser = parser.any(parenthesisParser, booleanParser, identifierParser, numberParser, stringParser)

var unaryOperatorParser = input => mayBe(
    unaryOperatorRegex.exec(input.str),
    (m, operator, rest) => returnRest(operator, input, rest, {'name': 'column', 'value': operator.length})
  )

var unaryExprParser = parser.bind(
  parser.bind(
    unaryOperatorParser,
    operator => rest => operator === ':type'
      ? spaceParser(rest) !== null ? ['typeof', spaceParser(rest)[1]] : null
      : [operator, rest]),
  operator => rest => mayBe(expressionParser(rest),
    (argument, rest) => [estemplate.unaryExpression(operator, argument), rest])
)

var binaryOperatorParser = parser.regex(binaryOperatorRegex)

var declParser = parser.bind(
  parser.bind(
    identifierParser,
    val => input => mayBe(
        equalSignParser(input),
        (v, rest) => [val, rest]
      )
  ),
  val => input => mayBe(
        parser.any(ifExprParser, binaryExprParser, fnCallParser, expressionParser, unaryExprParser)(input),
        (v, rest) => {
          return returnRest(estemplate.declaration(val, v), input, rest.str)
        }
      )
)

var paramParser = parser.all(spaceParser, parser.any(identifierParser, numberParser))

var paramsParser = (str, paramArray = []) => {
  var param = paramParser(str)
  return (param !== null) ? paramsParser(param[1], paramArray.concat(param[0][1]))
                          : [paramArray, str]
}

var fnDeclParser = parser.bind(
  parser.bind(
    parser.bind(
      identifierParser,
      val => input => mayBe(
        paramsParser(input),
        (params, rest) => returnRest(estemplate.funcDeclaration(val, params), input, rest.str)
      )
    ),
    val => input => mayBe(
        equalSignParser(input),
        (v, rest) => [val, rest]
      )
  ),
  val => input => mayBe(
      parser.any(ifExprParser, binaryExprParser, fnCallParser, expressionParser)(input),
      (v, rest) => {
        val.declarations[0].init.body = v
        return returnRest(val, input, rest.str)
      }
    )
)

var lambdaParamParser = parser.all(identifierParser, spaceParser)

var lambdaParamsParser = (str, lambdaparamArray = []) => {
  var arg = lambdaParamParser(str)
  if (arg !== null) return lambdaParamsParser(arg[1], lambdaparamArray.concat(arg[0][0]))
  return [lambdaparamArray, str]
}

var lambdaParser = parser.bind(
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
     (v, rest) => {
       val.expression.body = v
       return returnRest(val, input, rest.str)
     }
   )
 )

var letParamParser = parser.all(expressionParser, equalSignParser, expressionParser, spaceParser)

var letParamsParser = (str, letIdArray = [], letLiteralArray = []) => {
  var param = letParamParser(str)
  if (param !== null) return letParamsParser(param[1], letIdArray.concat(param[0][0]), letLiteralArray.concat(param[0][2]))
  return [letIdArray, letLiteralArray, str]
}

var letExpressionParser = parser.bind(
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
      parser.any(binaryExprParser, fnCallParser, expressionParser)(input),
      (v, rest) => {
        val.expression.callee.body = v
        return returnRest(val, input, rest.str)
      }
    )
  )

var memberPropParser = parser.all(identifierParser, dotParser)

var memberPropsParser = (str, memberArray = []) => {
  var result = memberPropParser(str)
  if (result !== null) return memberPropsParser(result[1], memberArray.concat(result[0][0]))
  if (result === null && memberArray.length === 0) return null
  var property = identifierParser(str)
  if (property === null) return null
  let tree = memberExprParser(memberArray.concat(property[0]))
  return [tree, property[1]]
}

var memberExprParser = (str, tree = {}) => {
  let memExpr = estemplate.memberExpression
  tree = memExpr(str[0], str[1])
  for (let i = 2; i < str.length; i++) {
    tree = memExpr(tree.expression, str[i])
  }
  return tree
}

var argsParser = (input, argArray = []) => {
  var arg = parser.all(
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

var fnCallParser = parser.bind(
  parser.all(parser.any(memberPropsParser, identifierParser), spaceParser),
  val => input => mayBe(
      argsParser(input),
      (args, rest) => val[1] === 'n' ? null : returnRest(estemplate.fnCall(val[0], args), input, rest.str)
    )
)

var ifExprParser = input => mayBe(
  parser.all(
    ifParser, expressionParser,
    spaceParser, thenParser, expressionParser,
    spaceParser, elseParser, expressionParser)(input),
    (val, rest) => {
      let [, condition, , , consequent, , , alternate] = val
      return returnRest(estemplate.ifthenelse(condition, consequent, alternate), input, rest.str)
    }
)
var multiLineParser = src => {
  if (src.length < 2) return src
  if (!indentParser(src[1])) return src
  const lead = src.splice(0, 1)
  const follow = src.splice(0, 1)
  src.unshift(lead + follow)
  return multiLineParser(src)
}

var statementParser = parser.any(returnParser, letExpressionParser, declParser, ifExprParser, fnDeclParser, fnCallParser, lambdaParser)

var programParser = (input, ast = estemplate.ast()) => {
  let result = statementParser(returnRest('', input, multiLineParser(input.str.split('\n')).join('\n'))[1])
  if (result === null) return updateAst(ast)
  if (typeof result[0] !== 'string') ast.body.push(result[0])
  return programParser(result[1], ast)
}

/* helper functions for binaryExprParser */
const precedence = operator => opPrec[operator].prec
const associativity = operator => opPrec[operator].assoc
const current = parser.any(binaryOperatorParser, spaceParser, fnCallParser, unaryExprParser, expressionParser)
const isBinaryOperator = token => opPrec[token] !== undefined
const isExpression = token => token.type !== undefined

var binaryExprParser = src => {
  let opStack = ['$']
  let operandStack = []
  let biExpr = estemplate.binaryExpression
  var descender = s => {
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
  let [val, rest] = descender(src)
  return val === null ? null : [val, rest]
}

var objectSpaceParser = input => {
  let val = ''
  let space = spaceParser(input)
  if (space !== null) {
    let [val, rest] = space
    return returnRest(val, input, rest.str)
  }
  return returnRest(val, input, input.str)
}

var objectParser = input => {
  let openCurlyResult, closeCurlyResult
  if (!(openCurlyResult = openCurlyBraceParser(input))) return null
  let [, rest] = openCurlyResult
  let result = objectPropsParser(rest)
  if (result === null) return null
  let [objPropArray, objPropsRest] = result
  if (!(closeCurlyResult = closeCurlyBraceParser(objPropsRest))) return null
  rest = closeCurlyResult[1]
  return [estemplate.object(objPropArray), rest]
}

var keyParser = parser.any(identifierParser, stringParser, numberParser)

var valueParser = parser.any(unaryExprParser, expressionParser, objectParser)

var objectPropParser = input => mayBe(
  parser.all(objectSpaceParser, keyParser, objectSpaceParser, colonParser,
             objectSpaceParser, valueParser, objectSpaceParser)(input),
    (val, rest) => {
      let [ , key, , , , value, , ] = val
      return [estemplate.objectProperty(key, value), rest]
    }
)

var objectPropsParser = (input, propArr = []) => {
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
