/*
  Parser
  Parses clean source. Generates clean AST.
*/

// Utility functions

const mayBe = (value, func) => value === null ? null : func(...value)
// const either = (conditional, fn1, fn2) => conditional === null ? fn1(...conditional) : fn2

// Predifined regexes

const idRegex = /^([a-zA-Z]+[a-zA-Z0-9_]*)((.|\n)*)$/
const numRegex = /^([\-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[e][+\-]?\d+)?)((.|\n)*)$/
// const nullRegEx       = /^null\b/i
const boolRegex = /^(true|false)((.|\n)*)$/i
const stringRegex = /^(\'[^\\']*(?:\\.[^\\']*)*\')(.*)$/
// const argsRegex = /^([^=]*)((.|\n)*)$/

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
  (a, num, rest) => [{type: 'Literal', value: Number(num), raw: num}, rest]
)

const identifierParser = str => mayBe(
  idRegex.exec(str),
  (a, name, rest) => [{type: 'Identifier', name: name}, rest]
)

const stringParser = str => mayBe(
  stringRegex.exec(str),
  (a, string, rest) => [{ type: 'StringLiteral', value: '"' + string + '"' }, rest]
)

const booleanParser = str => mayBe(
  boolRegex.exec(str),
  (a, bool, rest) => [{type: 'Literal', value: bool}, rest]
)

const paramParser = parser.all(spaceParser, parser.any(numberParser, identifierParser))

const paramsParser = (str, paramArray = []) => {
  const param = paramParser(str)
  if (param !== null) return paramsParser(param[1], paramArray.concat(param[0][1]))
  return [paramArray, str]
}

const fnDeclParser = parser.bind(
  parser.bind(
    parser.bind(
      identifierParser,
      val => str => mayBe(
        paramsParser(str),
        (params, rest) => [{
          type: 'VariableDeclaration',
          declarations: [
            {
              type: 'VariableDeclarator',
              id: {
                type: 'Identifier',
                name: val
              },
              init: {
                type: 'ArrowFunctionExpression',
                id: null,
                params: params,
                body: {},
                generator: false,
                expression: true
              }
            }
          ],
          kind: 'const'}, rest]
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

const expressionParser = parser.any(numberParser)

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
    (v, rest) => [{type: 'VariableDeclaration',
                   kind: 'const',
                   declarations: [{id: val, init: v}]}, rest]
  )
)

module.exports = function (src) {
  const ast = {type: 'Program', body: []}
  // const [space, rest] = spaceParser(src)
  // console.log(rest)
  const result = fnDeclParser(src)
  if (result !== null) ast.body.push(result[0])
  return ast
}
