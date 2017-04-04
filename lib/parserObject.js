const utils = require('./utilityFunctions')
/* Utility Functions */
const {
  isUndefined,
  maybe,
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

const lastParsed = {line: 1, column: 0}

const updateParsed = val => {
  let maxLine = lastParsed.line < val.line // if existing parsed line is less than newly parsed line
  let maxColumn = lastParsed.line === val.line && lastParsed.column < val.column // if lines match then compare column
  if (maxLine) {
    let currentExpr = val.str.split('\n')[0];
    [lastParsed.str, lastParsed.line, lastParsed.column] = [currentExpr, val.line, val.column]
  }
  if (maxColumn) {
    if (isUndefined(lastParsed.str)) lastParsed.str = val.str
    lastParsed.column = val.column
  }
}

parser.regex = regex => src => maybe(
  regex().exec(src.str),
  (m, val, rest) => {
    let result = returnRest(val, src, rest, {'name': 'column', 'value': val.length})
    updateParsed(result[1])
    return result
  }
)

parser.bind = (mv, mf) => input => maybe(
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

parser.any = (...parsers) => (...src) => {
  for (let parser of parsers) {
    let result = parser(...src)
    if (result !== null) return result
  }
  return null
}

/* Module exports the parser object along with all its methods */
module.exports = {parser, lastParsed}
