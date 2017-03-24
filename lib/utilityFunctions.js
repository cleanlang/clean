const {ioFuncs, ioMeths} = require('./ioMethods')
const languageConstruct = require('./languageConstructs')
const opSpec = require('./operatorPrecedence')
/*  Utility functions  */
const mayBe = (value, func) => value === null ? null : func(...value)
const isLanguageConstruct = id => languageConstruct[id]
const isIOFunc = id => ioFuncs[id]
const isIOMethod = id => ioMeths[id]
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

const isEmptyObj = obj => {
  for (let prop in obj) {
    if (obj.hasOwnProperty(prop)) return false
  }
  return true
}

/* Functions for the  binary expression parser */
const precedence = operator => opSpec[operator].prec
const associativity = operator => opSpec[operator].assoc

module.exports = {
  mayBe,
  isLanguageConstruct,
  isIOFunc,
  isIOMethod,
  unescape,
  returnRest,
  isEmptyObj,
  precedence,
  associativity
}
