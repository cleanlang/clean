/*
  Parser
  Parses clean source. Generates clean AST.
*/
const opPrec = require('./operatorPrecedence')
const estemplate = require('./estemplate')
/*  Utility functions  */
const mayBe = (value, func) => value === null ? null : func(...value)
const precedence = operator => opPrec[operator].prec
const associativity = operator => opPrec[operator].assoc
const lookAhead = src => {
  let match = parser.all(spaceParser, binaryOperatorParser, spaceParser)(src)
  if (match !== null) {
    let [[, operator], remaining] = match
    return [operator, remaining]
  }
  return null
}
// Predifined regexes

/*  Predifined regexes */
const idRegex = /^([a-zA-Z]+[a-zA-Z0-9_]*)((.|\n)*)$/
const numRegex = /^([\-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[e][+\-]?\d+)?)((.|\n)*)$/
const boolRegex = /^(true|false)((.|\n)*)$/i
const stringRegex = /^(\'[^\\']*(?:\\.[^\\']*)*\')((.|\n)*)$/
// var argsRegex = /^([^=]*)((.|\n)*)$/
const binaryOperatorRegex = /^(\+|\-|\/|\*|\<\<|\<\=|\<|\>\>\>|\>\>|\>\=|\>|\&\&|\&|\|\||\||\^|\=\=)(?=\s)((.|\n)*)$/
// var nullRegEx       = /^null\b/i

/*
  Parser factory. Used to create parsers
  parser.regex - creates parser for given regex
  parser.bind - applies monadic bind on parsers
  parser.all - All parsers supplied MUST match
  parser.any - ANY ONE of the parsers need match
*/

const parser = {}

parser.regex = regex => src => mayBe(
  regex.exec(src),
  (m, val, rest) => [val, rest]
)

parser.bind = (mv, mf) => str => mayBe(
  mv(str),
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
var spaceParser = parser.regex(/^(\s+)((.|\n)*)$/)

var equalSignParser = parser.regex(/^(\s+=\s+)((.|\n)*)$/)

var thinArrowParser = parser.regex(/^(\s*->\s+)((.|\n)*)$/)

var slashParser = parser.regex(/^(\s*\\)((.|\n)*)$/)

var letParser = parser.regex(/^(\s*let\s+)((.|\n)*)$/)

var inParser = parser.regex(/^(\s*in\s+)((.|\n)*)$/)

var numberParser = str => mayBe(
  numRegex.exec(str),
  (a, num, rest) => [estemplate.literal(num, num), rest]
)

var identifierParser = str => mayBe(
  idRegex.exec(str),
  (a, name, rest) => [estemplate.identifier(name), rest]
)

var stringParser = str => mayBe(
  stringRegex.exec(str),
  (a, string, rest) => [estemplate.stringLiteral(string), rest]
)

var booleanParser = str => mayBe(
  boolRegex.exec(str),
  (a, bool, rest) => [estemplate.literal(bool), rest]
)

var parenthesisParser = parser.bind(
  parser.bind(
    parser.bind(
      parser.bind(
        str => str.startsWith('(') ? ['(', str.substr(1)] : null,
        val => str => {
          var space = spaceParser(str)
          return space ? [space[0], space[1]] : [null, str]
        }
      ),
      val => str => mayBe(
          parser.any(binaryExprParser, fnCallParser, expressionParser)(str),
          (v, rest) => [v, rest]
        )
    ),
    val => str => {
      var space = spaceParser(str)
      return space ? [val, space[1]] : [val, str]
    }
  ),
  val => str => str.startsWith(')') ? [val, str.substr(1)] : null
)

var paramParser = parser.all(spaceParser, parser.any(identifierParser, numberParser))

var paramsParser = (str, paramArray = []) => {
  var param = paramParser(str)
  if (param !== null) return paramsParser(param[1], paramArray.concat(param[0][1]))
  return [paramArray, str]
}

var expressionParser = parser.any(parenthesisParser, booleanParser, identifierParser, numberParser)

var binaryOperatorParser = parser.regex(binaryOperatorRegex)

var binaryExprParser = src => {
  var biExpr = estemplate.binaryExpression

  let result = parser.all(
                          parser.any(fnCallParser, expressionParser),
                          spaceParser,
                          binaryOperatorParser,
                          spaceParser,
                          parser.any(fnCallParser, expressionParser))(src)

  if (result === null) return null
  let [[leftOperand, , firstOperator, , rightOperand], rest] = result

  if (lookAhead(rest) === null) {
    return [biExpr(leftOperand, firstOperator, rightOperand), rest]
  }

  let [nextOperator, possibleExpr] = lookAhead(rest)

  let p = parser.any(binaryExprParser, expressionParser)(possibleExpr)
  if (p === null) return null
  let [nextExpr, remaining] = p

  if (precedence(nextOperator) < precedence(firstOperator)) {
    return [
      biExpr(
        biExpr(leftOperand, firstOperator, rightOperand),
        nextOperator,
        nextExpr),
      remaining]
  }

  if (precedence(nextOperator) > precedence(firstOperator)) {
    return (nextExpr.type === 'BinaryExpression') &&
           (precedence(nextExpr.operator) < precedence(nextOperator))
           ? [
             biExpr(
               biExpr(
                 leftOperand,
                 firstOperator,
                 biExpr(rightOperand, nextOperator, nextExpr.left)),
               nextExpr.operator,
               nextExpr.right),
             remaining]
             : [
               biExpr(
                 leftOperand,
                 firstOperator,
                 biExpr(rightOperand, nextOperator, nextExpr)),
               remaining]
  }

  return associativity(firstOperator) === 'R'
          ? [
            biExpr(
              leftOperand,
              firstOperator,
              biExpr(rightOperand, nextOperator, nextExpr)),
            remaining]
            : [
              biExpr(
                biExpr(leftOperand, firstOperator, rightOperand),
                nextOperator,
                nextExpr),
              remaining]
}

var declParser = parser.bind(
  parser.bind(
    identifierParser,
    val => str => mayBe(
      equalSignParser(str),
      (v, rest) => [val, rest]
    )
  ),
  val => str => mayBe(
    parser.any(binaryExprParser, expressionParser)(str),
    (v, rest) => [estemplate.declaration(val, v), rest]
  )
)

var fnDeclParser = parser.bind(
  parser.bind(
    parser.bind(
      identifierParser,
      val => str => mayBe(
        paramsParser(str),
        (params, rest) => [estemplate.funcDeclaration(val, params), rest]
      )
    ),
    val => str => mayBe(
      equalSignParser(str),
      (v, rest) => [val, rest]
    )
  ),
  val => str => mayBe(
    parser.any(binaryExprParser, expressionParser, fnCallParser)(str),
    (v, rest) => {
      val.declarations[0].init.body = v
      return [val, rest]
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
      val => str => mayBe(
        lambdaParamsParser(str),
        (params, rest) => [estemplate.lambda(params), rest]
       )
      ),
    val => str => mayBe(
      thinArrowParser(str),
      (v, rest) => [val, rest]
    )
   ),
   val => str => mayBe(
     expressionParser(str),
     (v, rest) => {
       val.expression.body = v
       return [val, rest]
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
      val => str => mayBe(
        letParamsParser(str),
        (val1, val2, rest) => [estemplate.letExpression(val1, val2), rest]
     )
    ),
    val => str => mayBe(
      inParser(str),
      (v, rest) => [val, rest]
    )
  ),
  val => str => mayBe(
    expressionParser(str),
    (v, rest) => {
      val.expression.callee.body = v
      return [val, rest]
    }
  )
)

var parenCheck = str => str[0] === ')' ? [')', str] : null

var argsParser = (str, argArray = []) => {
  var arg = parser.all(expressionParser, parser.any(spaceParser, parenCheck))(str)
  if (arg === null) return argArray.length === 0 ? null : [argArray, str]
  let [[argument, nextChar], rest] = arg
  if (argument.type === 'ExpressionStatement') argument = argument.expression
  if (nextChar === '\n' || nextChar === ')') return [argArray.concat(argument), rest]
  return argsParser(rest, argArray.concat(argument))
}

var fnCallParser = parser.bind(
  parser.all(identifierParser, spaceParser),
  val => str => mayBe(
    argsParser(str),
    (args, rest) => [estemplate.fnCall(val[0], args), rest]
  )
)

var statementParser = parser.any(spaceParser, letExpressionParser, declParser, fnDeclParser, fnCallParser, lambdaParser)

var programParser = (str, ast = estemplate.ast()) => {
  let result = statementParser(str)
  if (result === null) return ast
  if (typeof result[0] !== 'string') ast.body.push(result[0])
  return programParser(result[1], ast)
}

/*  Module Exports programParser  */
module.exports = programParser
