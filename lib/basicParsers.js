const parser = require('./parserObject')
const estemplate = require('./estemplate')
const libPath = require('./import/libPath')

/* Utility Functions */
const {
  mayBe,
  isLanguageConstruct,
  isIOFunc,
  isIOMethod,
  unescape,
  returnRest
} = require('./utilityFunctions')

/*  Predefined regexes */
const spaceRegex = /^([ \t]+)((.|\n)*)$/
const returnRegex = /^(\n)((.|\n)*)$/
const idRegex = /^([_a-zA-Z]+[a-zA-Z0-9_]*)((.|\n)*)$/
const numRegex = /^((?:\d+(?:\.\d*)?|\.\d+)(?:[e][+-]?\d+)?)((.|\n)*)$/
const boolRegex = /^(true|false)((.|\n)*)$/i
const stringRegex = /^('[^\\']*(?:\\.[^\\']*)*')((.|\n)*)$/
const binaryOperatorRegex = /^(\+\+|\+|-|%|\/|\*|<<|<=|<|>y>>|>>|>=|>|&&|&|\|\||\||\^|==|!=)((.|\n)*)$/
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
const nullRegex = /^(null)((.|\n)*)$/
const assignmentOperatorRegex = /^(\+=|-=|\*=|\/=|\*\*=|>>>=|>>=|<<=|%=|&=|\^=|\|=|=)((.|\n)*)$/

/*
  All required parsers are created below
*/
const spaceParser = parser.regex(spaceRegex)

const equalSignParser = parser.regex(/^(\s+=\s+)((.|\n)*)$/)

const assignmentOperator = parser.regex(assignmentOperatorRegex)

const thinArrowParser = parser.regex(/^(\s*->\s+)((.|\n)*)$/)

const reverseBindParser = parser.regex(/^(\s*<-\s+)((.|\n)*)$/)

const slashParser = parser.regex(/^(\s*\\)((.|\n)*)$/)

const letParser = parser.regex(/^(\s*let\s+)((.|\n)*)$/)

const inParser = parser.regex(/^(\s*in\s+)((.|\n)*)$/)

const dotParser = parser.regex(/^(\.)((.|\n)*)$/)

const ifParser = parser.regex(/^(if\s+)((.|\n)*)$/)
const thenParser = parser.regex(/^(then\s+)((.|\n)*)$/)
const elseParser = parser.regex(/^(else\s+)((.|\n)*)$/)

const doParser = parser.regex(/^(do)((.|\n)*)$/)

const returnKeywordParser = parser.regex(/^(return)((.|\n)*)$/)

const returnParser = input => mayBe(
  returnRegex.exec(input.str),
  (a, newLine, rest) => returnRest(newLine, input, rest, {'name': 'return', 'value': 1})
)

const numberParser = input => mayBe(
  numRegex.exec(input.str),
  (a, num, rest) => returnRest(estemplate.literal(num, num), input, rest, {'name': 'column', 'value': num.length})
)

const identifierParser = input => mayBe(
  idRegex.exec(input.str),
  (a, name, rest) => (isLanguageConstruct(name) || isIOFunc(name) || isIOMethod(name)) ? null
    : returnRest(estemplate.identifier(name), input, rest, {'name': 'column', 'value': name.length}))

const ioFuncNameParser = input => mayBe(
  idRegex.exec(input.str),
  (a, name, rest) => isIOFunc(name) ? returnRest(estemplate.identifier(name), input, rest, {'name': 'column', 'value': name.length}) : null
)

const ioMethodNameParser = input => mayBe(
  idRegex.exec(input.str),
  (a, name, rest) => isIOMethod(name) ? returnRest(estemplate.identifier(name), input, rest, {'name': 'column', 'value': name.length}) : null
)

const nullParser = input => mayBe(
  nullRegex.exec(input.str),
  (a, val, rest) => returnRest(estemplate.nullLiteral(val), input, rest, {'name': 'column', 'value': 4})
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

const binaryOperatorParser = parser.regex(binaryOperatorRegex)

const assignmentOperatorParser = input => {
  let result = parser.all(spaceParser, assignmentOperator, spaceParser)(input)
  if (result === null) return null
  let [[sp1, val, sp2], rest] = result
  return returnRest(val, input, rest.str, {'name': 'column', 'value': (sp1 + val + sp2).length})
}

const unaryOperatorParser = input => mayBe(
    unaryOperatorRegex.exec(input.str),
    (m, operator, rest) => returnRest(operator, input, rest, {'name': 'column', 'value': operator.length})
)

const parenCheck = src => mayBe(parser.regex(/^(\))((.|\n)*)$/)(src),
                              (m, val, rest) => returnRest(val, src, src.str))

const mayBeSpace = input => {
  let val = ''
  let space = spaceParser(input)
  let rest = input
  if (space !== null) [val, rest] = space
  return returnRest(val, input, rest.str, {name: 'column', value: val.length})
}

const mayBeNewLine = input => {
  let val = ''
  let result = parser.all(returnParser, spaceParser)(input)
  let rest = input
  if (result !== null) {
    [val, rest] = result
    let [, indent] = val
    return returnRest(indent, input, rest.str, {name: 'indent', value: indent.length})
  }
  return null
}

const mayBeNewLineAndIndent = input => parser.any(mayBeNewLine, mayBeSpace)(input)

const importKeywordParser = input => parser.regex(/^(import)((.|\n)*)$/)(input)

const libNameParser = input => mayBe(
  parser.regex(/^(node-core|browser-core)((.|\n)*)$/)(input),
  (val, rest) => {
    val = libPath + val
    return returnRest(estemplate.stringLiteral(val), input, rest.str)
  }
)

const importParser = input => mayBe(
  parser.all(importKeywordParser, spaceParser, libNameParser)(input),
  (val, rest) => returnRest(estemplate.import(val[2]), input, rest.str)
)

/* Module exports all basic parsers */
module.exports = {
  returnParser,
  spaceParser,
  mayBeSpace,
  mayBeNewLineAndIndent,
  numberParser,
  identifierParser,
  ioFuncNameParser,
  ioMethodNameParser,
  nullParser,
  stringParser,
  booleanParser,
  openParensParser,
  closeParensParser,
  openCurlyBraceParser,
  closeCurlyBraceParser,
  openSquareBracketParser,
  closeSquareBracketParser,
  commaParser,
  colonParser,
  singleLineCommentParser,
  multiLineCommentParser,
  binaryOperatorParser,
  unaryOperatorParser,
  letParser,
  inParser,
  dotParser,
  thinArrowParser,
  reverseBindParser,
  ifParser,
  thenParser,
  elseParser,
  doParser,
  equalSignParser,
  slashParser,
  parenCheck,
  assignmentOperatorParser,
  returnKeywordParser,
  importParser
}
