/*
  Parser
  Parses clean source. Generates clean AST.
*/

const estemplate = require('./template')

/*  Utility functions  */
const mayBe = (value, func) => value === null ? null : func(...value)

/*  Predifined regexes */
const idRegex = /^([a-zA-Z]+[a-zA-Z0-9_]*)((.|\n)*)$/
const numRegex = /^([\-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[e][+\-]?\d+)?)((.|\n)*)$/
const boolRegex = /^(true|false)((.|\n)*)$/i
const stringRegex = /^(\'[^\\']*(?:\\.[^\\']*)*\')((.|\n)*)$/
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

const thinArrowParser = parser.regex(/^(\s*->\s+)((.|\n)*)$/)

const slashParser = parser.regex(/^(\s*\\)((.|\n)*)$/)

const letParser = parser.regex(/^(\s*let\s+)((.|\n)*)$/)

const inParser = parser.regex(/^(\s*in\s+)((.|\n)*)$/)

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

const expressionParser = parser.any(identifierParser, numberParser)

const declParser = parser.bind(
  parser.bind(
    identifierParser,
    val => str => mayBe(
      equalSignParser(str),
      (v, rest) => [val, rest]
    )
  ),
  val => str => mayBe(
    expressionParser(str),
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

const lambdaParamParser = parser.all(identifierParser, spaceParser)

const lambdaParamsParser = (str, lambdaparamArray = []) => {
  const arg = lambdaParamParser(str)
  if (arg !== null) return lambdaParamsParser(arg[1], lambdaparamArray.concat(arg[0][0]))
  return [lambdaparamArray, str]
}

const lambdaParser = parser.bind(
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

const letParamParser = parser.all(expressionParser, equalSignParser, expressionParser, spaceParser)

const letParamsParser = (str, letIdArray = [], letLiteralArray = []) => {
  const param = letParamParser(str)
  if (param !== null) return letParamsParser(param[1], letIdArray.concat(param[0][0]), letLiteralArray.concat(param[0][2]))
  return [letIdArray, letLiteralArray, str]
}

const letExpressionParser = parser.bind(
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

const argParser = parser.all(spaceParser, expressionParser)

const argsParser = (str, argArray = []) => {
  const arg = argParser(str)
  if (arg !== null) return argsParser(arg[1], argArray.concat(arg[0][1]))
  return [argArray, str]
}

const fnCallParser = parser.bind(
  identifierParser,
  val => str => mayBe(
    argsParser(str),
    (args, rest) => [estemplate.fnCall(val, args), rest]
  )
)

const statementParser = parser.all(
  spaceParser,
  parser.any(letExpressionParser, declParser, fnCallParser, fnDeclParser, lambdaParser)
)

const programParser = (str, ast) => {
  if (ast === undefined) ast = estemplate.ast()
  let result = statementParser(str)
  if (result === null) return ast
  ast.body.push(result[0][1])
  return programParser(result[1], ast)
}

//console.log(JSON.stringify(programParser(` let x = 10 y = 20 in 4`), null, 4))
console.log(JSON.stringify(letExpressionParser(` let x = 10 y = 20 in 4`), null, 4))

/*  Module Exports programParser  */
module.exports = programParser
