const utils = require('./utilityFunctions')
/* Utility Functions */
const {
  mayBe,
  returnRest
} = utils

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

/* Module exports the parser object along with all its methods */
module.exports = parser
