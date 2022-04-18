const {
  staticIOMethods,
  ioMethods,
  domMethods
} = require('./ioMethods')
const languageConstruct = require('./languageConstructs')
const opSpec = require('./operatorPrecedence')
/*  Utility functions  */
const maybe = (value, func) => (value === null ? null : func(...value))
const isLanguageConstruct = (id) => languageConstruct[id]
const isStaticIOMethod = (id) => staticIOMethods[id]
const isIOMethod = (id) => ioMethods[id]
const isDOMmethod = (id) => domMethods[id]
const unescape = (str) =>
  str
    .replace(/(^')/, '')
    .replace(/('$)/, '')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\r/g, '\r')
    .replace(/\\'/g, "'")

let isInLine = false
const returnRest = (val, input, rest, field) => {
  const output = JSON.parse(JSON.stringify(input))
  if (val.type === 'Line') {
    val.isInLine = isInLine
  }
  if (field) {
    const value = field.value
    switch (field.name) {
      case 'return':
        isInLine = false
        output.column = 0
        output.line += value
        break
      case 'column':
        isInLine = true
        output.column += value
        break
    }
  }
  output.str = rest
  val.cursorLoc = { line: output.line, column: output.column }
  return [val, output]
}

const isEmptyObj = (obj) => {
  for (const prop in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, prop)) return false
  }
  return true
}

const isEmptyArr = (arr) => arr.toString() === ''

const isNull = (...vals) =>
  vals.reduce((acc, v1) => v1 === null && acc, true)
const isUndefined = (...vals) => !notUndefined(...vals)

const notNull = (...vals) => !isNull(...vals)
const notUndefined = (...vals) =>
  vals.reduce((acc, v1) => v1 !== undefined && acc, true)
/* Functions for the  binary expression parser */
const precedence = (operator) => opSpec[operator].prec
const associativity = (operator) => opSpec[operator].assoc

module.exports = {
  maybe,
  isLanguageConstruct,
  isStaticIOMethod,
  isIOMethod,
  isDOMmethod,
  unescape,
  returnRest,
  isEmptyObj,
  isEmptyArr,
  isNull,
  isUndefined,
  notNull,
  notUndefined,
  precedence,
  associativity
}
