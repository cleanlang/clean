/*
  Parser
  Parses clean source. Generates clean AST.
*/

const estemplate = require('./template')

/*  Utility functions  */
const mayBe = (value, func) => value === null ? null : func(...value)

// Predifined regexes

/*  Predifined regexes */
const idRegex = /^([a-zA-Z]+[a-zA-Z0-9_]*)((.|\n)*)$/
const numRegex = /^([\-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[e][+\-]?\d+)?)((.|\n)*)$/
const boolRegex = /^(true|false)((.|\n)*)$/i
const stringRegex = /^(\'[^\\']*(?:\\.[^\\']*)*\')(.*)$/
// const argsRegex = /^([^=]*)((.|\n)*)$/
const binaryOperatorRegex = /^(\+|\-|\/|\*|\<\<|\<\=|\<|\>\>\>|\>\>|\>\=|\>|\&\&|\&|\|\||\||\^|\=\=)(?=\s)((.|\n)*)$/
const parenRegex = /^({[^{]*[^}]})((.|\n)*)$/
// const nullRegEx       = /^null\b/i

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
const spaceParser = parser.regex(/^(\s+)((.|\n)*)$/)

const equalSignParser = parser.regex(/^(\s+=\s+)((.|\n)*)$/)

const numberParser = str => mayBe(
  numRegex.exec(str),
  // (a, num, rest) => [{ type: 'Literal', value:Number(num), raw: num }, rest]
  (a, num, rest) => [estemplate.literal(Number(num), num), rest]
)

const identifierParser = str => mayBe(
  idRegex.exec(str),
  // (a, name, rest) => [{type: 'Identifier', name: name}, rest]
  (a, name, rest) => [estemplate.identifier(name), rest]
)

const stringParser = str => mayBe(
  stringRegex.exec(str),
  // (a, string, rest) => [{ type: 'StringLiteral', value: '"' + string + '"' }, rest]
  (a, string, rest) => [estemplate.stringliteral(string), rest]
)

const booleanParser = str => mayBe(
  boolRegex.exec(str),
  // (a, bool, rest) => [{type: 'Literal', value: bool}, rest]
  (a, bool, rest) => [estemplate.literal(bool), rest]
)

const paramParser = parser.all(spaceParser, parser.any(numberParser, identifierParser))

const paramsParser = (str, paramArray = []) => {
  const param = paramParser(str)
  if (param !== null) return paramsParser(param[1], paramArray.concat(param[0][1]))
  return [paramArray, str]
}

const expressionParser = parser.any(numberParser, identifierParser)

const binaryOperatorParser = parser.regex(binaryOperatorRegex)

const binaryExpressionParser = src => {
  let result = parser.all(
    expressionParser,
    spaceParser,
    binaryOperatorParser,
    spaceParser,
    parser.any(binaryExpressionParser, expressionParser))(src)

  if (result === null) { return null }
  let [val, rest] = result
  return [{
    type: 'BinaryExpression', operator: val[2], left: val[0], right: val[4]
  },
  rest]
}

const declParser = parser.bind(
  parser.bind(
    identifierParser,
    val => str => mayBe(
      equalSignParser(str),
      (v, rest) => [val, rest]
    )
  ),
  val => str => mayBe(
    parser.any(binaryExpressionParser, expressionParser)(str),
    (v, rest) => [estemplate.declaration(val, v), rest]
  )
)

const fnDeclParser = parser.bind(
  parser.bind(
    parser.bind(
      identifierParser,
      val => str => mayBe(
        paramsParser(str),
        (params, rest) => [estemplate.funcdeclaration(val, params), rest]
      )
    ),
    val => str => mayBe(
      equalSignParser(str),
      (v, rest) => [val, rest]
    )
  ),
  val => str => mayBe(
    expressionParser(str),
    (v, rest) => {
      val.declarations[0].init.body = v
      return [val, rest]
    }
  )
)

const statementParser = parser.all(
  spaceParser,
  parser.any(declParser, fnDeclParser)
)

const programParser = (str, ast) => {
  if (ast === undefined) ast = estemplate.ast()
  let result = statementParser(str)
  if (result === null) return ast
  ast.body.push(result[0][1])
  return programParser(result[1], ast)
}

/*  Module Exports programParser  */
module.exports = programParser
