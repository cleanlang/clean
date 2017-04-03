const parser = require('./parserObject')
const estemplate = require('./estemplate')

/* Utility Functions */
const {
  maybe,
  isLanguageConstruct,
  isIOFunc,
  isIOMethod,
  isNull,
  notNull,
  unescape,
  returnRest
} = require('./utilityFunctions')

/*  Predefined regexes */
const spaceRegex = () => /^([ \t]+)((.|\n)*)$/
const returnRegex = () => /^(\n)((.|\n)*)$/
const idRegex = () => /^([_a-zA-Z]+[a-zA-Z0-9_]*)((.|\n)*)$/
const numRegex = () => /^((?:\d+(?:\.\d*)?|\.\d+)(?:[e][+-]?\d+)?)((.|\n)*)$/
const boolRegex = () => /^(true|false)((.|\n)*)$/i
const stringRegex = () => /^('[^\\']*(?:\\.[^\\']*)*')((.|\n)*)$/
const binaryOperatorRegex = () => /^(\+\+|\+|-|%|\/|\*|<<|<=|<|>y>>|>>|>=|>|&&|&|\|\||\||\^|==|!=)((.|\n)*)$/
const unaryOperatorRegex = () => /^(:type|-|!)((.|\n)*)$/
const openCurlyRegex = () => /^({)((.|\n)*)$/
const closeCurlyRegex = () => /^(})((.|\n)*)$/
const openSquareBracketRegex = () => /^(\[)((.|\n)*)$/
const closeSquareBracketRegex = () => /^(])((.|\n)*)$/
const openParensRegex = () => /^(\()((.|\n)*)$/
const closeParensRegex = () => /^(\))((.|\n)*)$/
const commaRegex = () => /^(,)((.|\n)*)$/
const colonRegex = () => /^(:)((.|\n)*)$/
const singleLineCommentRegex = () => /^((\/\/)(.*)(\n))((.|\n)*)$/
const multiLineCommentRegex = () => /^((\/\*)((.|\n)*?)(\*\/))((.|\n)*)$/
const nullRegex = () => /^(null)((.|\n)*)$/
const deleteRegex = () => /^(delete)((.|\n)*)$/
const regexRegex = () => /^(\/((.|\n)*)\/(\w*))((.|\n)*)$/

/*
  All required parsers are created below
*/
const spaceParser = input => parser.regex(spaceRegex())(input)

const equalSignParser = input => parser.regex(/^(\s+=\s+)((.|\n)*)$/)(input)

const thinArrowParser = input => parser.regex(/^(\s*->\s+)((.|\n)*)$/)(input)

const reverseBindParser = input => parser.regex(/^(\s*<-\s+)((.|\n)*)$/)(input)

const slashParser = input => parser.regex(/^(\s*\\)((.|\n)*)$/)(input)

const letParser = input => parser.regex(/^(\s*let\s+)((.|\n)*)$/)(input)

const inParser = input => parser.regex(/^(\s*in\s+)((.|\n)*)$/)(input)

const dotParser = input => parser.regex(/^(\.)((.|\n)*)$/)(input)

const ifParser = input => parser.regex(/^(if\s+)((.|\n)*)$/)(input)
const thenParser = input => parser.regex(/^(then\s+)((.|\n)*)$/)(input)
const elseParser = input => parser.regex(/^(else\s+)((.|\n)*)$/)(input)

const doParser = input => parser.regex(/^(do)((.|\n)*)$/)(input)

const returnKeywordParser = input => parser.regex(/^(return)((.|\n)*)$/)(input)

const importKeywordParser = input => parser.regex(/^(import)((.|\n)*)$/)(input)

const definePropParser = input => parser.regex(/^(defineProp)((.|\n)*)$/)(input)

const returnParser = input => maybe(
  returnRegex().exec(input.str),
  (m, newLine, rest) => returnRest(newLine, input, rest, {'name': 'return', 'value': 1})
)

const numberParser = input => maybe(
  numRegex().exec(input.str),
  (m, num, rest) => returnRest(estemplate.literal(num, num), input, rest, {'name': 'column', 'value': num.length})
)

const nonReservedIdParser = input => maybe(
  idRegex().exec(input.str),
  (m, name, rest) => (isLanguageConstruct(name) || isIOFunc(name) || isIOMethod(name)) ? null
    : returnRest(estemplate.identifier(name), input, rest, {'name': 'column', 'value': name.length})
)

const identifierParser = input => maybe(
  idRegex().exec(input.str),
  (m, name, rest) => returnRest(estemplate.identifier(name), input, rest, {'name': 'column', 'value': name.length})
)

const ioFuncNameParser = input => maybe(
  idRegex().exec(input.str),
  (m, name, rest) => isIOFunc(name) ? returnRest(estemplate.identifier(name), input, rest, {'name': 'column', 'value': name.length}) : null
)

const ioMethodNameParser = input => maybe(
  idRegex().exec(input.str),
  (m, name, rest) => isIOMethod(name) ? returnRest(estemplate.identifier(name), input, rest, {'name': 'column', 'value': name.length}) : null
)

const nullParser = input => maybe(
  nullRegex().exec(input.str),
  (m, val, rest) => returnRest(estemplate.nullLiteral(val), input, rest, {'name': 'column', 'value': 4})
)

const stringParser = input => maybe(
  stringRegex().exec(input.str),
  (m, string, rest) => returnRest(estemplate.stringLiteral(unescape(string)),
                                  input, rest, {'name': 'column', 'value': string.length})
)

const booleanParser = input => maybe(
  boolRegex().exec(input.str),
  (m, bool, rest) => returnRest(estemplate.boolLiteral(bool), input, rest, {'name': 'column', 'value': bool.length})
)

const regexParser = input => maybe(
  regexRegex().exec(input.str),
  (m, regex, pattern, b, flags, rest) => returnRest(estemplate.regex(regex, pattern, flags), input, rest,
                                                    {'name': 'column', 'value': pattern.length})
)

const openParensParser = input => maybe(
  openParensRegex().exec(input.str),
  (m, openParens, rest) => returnRest(openParens, input, rest, {'name': 'column', 'value': 1})
)

const closeParensParser = input => maybe(
  closeParensRegex().exec(input.str),
  (m, closeParens, rest) => returnRest(closeParens, input, rest, {'name': 'column', 'value': 1})
)

const openCurlyBraceParser = input => maybe(
  openCurlyRegex().exec(input.str),
  (m, openCurlyBrace, rest) => returnRest(openCurlyBrace, input, rest, {'name': 'column', 'value': openCurlyBrace.length})
)

const closeCurlyBraceParser = input => maybe(
  closeCurlyRegex().exec(input.str),
  (m, closeCurlyBrace, rest) => returnRest(closeCurlyBrace, input, rest, {'name': 'column', 'value': closeCurlyBrace.length})
)

const openSquareBracketParser = input => maybe(
  openSquareBracketRegex().exec(input.str),
  (m, openSquareBracket, rest) => returnRest(openSquareBracket, input, rest, {'name': 'column', 'value': openSquareBracket.length})
)

const closeSquareBracketParser = input => maybe(
  closeSquareBracketRegex().exec(input.str),
  (m, closeSquareBracket, rest) => returnRest(closeSquareBracket, input, rest, {'name': 'column', 'value': closeSquareBracket.length})
)

const commaParser = input => maybe(
  commaRegex().exec(input.str),
  (m, comma, rest) => returnRest(comma, input, rest, {'name': 'column', 'value': comma.length})
)

const colonParser = input => maybe(
  colonRegex().exec(input.str),
  (m, colon, rest) => returnRest(colon, input, rest, {'name': 'column', 'value': colon.length})
)

const singleLineCommentParser = input => maybe(
  singleLineCommentRegex().exec(input.str),
  (...vals) => {
    let [, comment, , , , rest] = vals
    let val = comment.slice(2, comment.length - 1)
    return returnRest(estemplate.comment('Line', val), input, rest, {'name': 'return', 'value': 1})
  }
)

const multiLineCommentParser = input => maybe(
  multiLineCommentRegex().exec(input.str),
  (...vals) => {
    let [, comment, , , , , rest] = vals
    let lineCount = notNull(comment.match(/\n/g)) ? comment.match(/\n/g).length : 0
    let val = comment.slice(2, comment.length - 2)
    return returnRest(estemplate.comment('Block', val), input, rest, {'name': 'return', 'value': lineCount})
  }
)

const binaryOperatorParser = input => maybe(
  parser.all(maybeSpace, parser.regex(binaryOperatorRegex()), maybeSpace)(input),
  (val, rest) => {
    let [sp1, op, sp2] = val
    return returnRest(op, input, rest.str, {'name': 'column', 'value': (sp1 + op + sp2).length})
  })

const unaryOperatorParser = input => maybe(
  unaryOperatorRegex().exec(input.str),
  (m, operator, rest) => returnRest(operator, input, rest, {'name': 'column', 'value': operator.length})
)

const parenCheck = src => maybe(
  parser.regex(/^(\))((.|\n)*)$/)(src),
  (m, val, rest) => returnRest(val, src, src.str)
)

const maybeSpace = input => {
  let val = ''
  let space = spaceParser(input)
  let rest = input
  if (notNull(space)) [val, rest] = space
  return returnRest(val, input, rest.str, {name: 'column', value: val.length})
}

const maybeNewLine = input => {
  let result = parser.all(returnParser, spaceParser)(input)
  if (notNull(result)) {
    let [val, rest] = result
    let [, indent] = val
    return returnRest(indent, input, rest.str, {name: 'indent', value: indent.length})
  }
  return null
}

const maybeNewLineAndIndent = input => parser.any(maybeNewLine, maybeSpace)(input)

const libNameParser = input => maybe(
  parser.regex(/^(node-core|browser-core)((.|\n)*)$/)(input),
  (val, rest) => returnRest(val, input, rest.str)
)

const importParser = input => maybe(
  parser.all(importKeywordParser, spaceParser, libNameParser)(input),
  (val, rest) => returnRest(val[2], input, rest.str)
)

const deleteKeywordParser = input => maybe(
  deleteRegex().exec(input.str),
    (m, operator, rest) => returnRest(operator, input, rest, {'name': 'column', 'value': operator.length})
)

const emptyArgsParser = input => {
  let result = parser.all(openParensParser, maybeSpace, closeParensParser)(input)
  if (isNull(result)) return null
  let [, rest] = result
  return [[], rest]
}
/* Module exports all basic parsers */
module.exports = {
  returnParser,
  spaceParser,
  maybeSpace,
  maybeNewLineAndIndent,
  numberParser,
  nonReservedIdParser,
  identifierParser,
  ioFuncNameParser,
  ioMethodNameParser,
  nullParser,
  stringParser,
  booleanParser,
  regexParser,
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
  returnKeywordParser,
  importParser,
  deleteKeywordParser,
  emptyArgsParser,
  definePropParser
}
