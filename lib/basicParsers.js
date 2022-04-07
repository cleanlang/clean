const parser = require('./parserObject')
const estemplate = require('./estemplate')

/* Utility Functions */
const {
  maybe,
  isLanguageConstruct,
  isStaticIOMethod,
  isIOMethod,
  isDOMmethod,
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
const boolRegex = () => /^(true|false)((.|\n)*)$/
const stringRegex = () => /^('[^\\\n']*(?:\\.[^\\\n']*)*')((.|\n)*)$/
const binaryOperatorRegex = () =>
  /^(\+\+|\+|-|%|\/|\*|<<|<=|<|>>>|>>|>=|>|&&|&|\|\||\||\^|==|!=)((.|\n)*)$/
const unaryOperatorRegex = () => /^(:type|-|!)((.|\n)*)$/
const openCurlyRegex = () => /^({)((.|\n)*)$/
const closeCurlyRegex = () => /^(})((.|\n)*)$/
const openSquareBracketRegex = () => /^(\[)((.|\n)*)$/
const closeSquareBracketRegex = () => /^(])((.|\n)*)$/
const openParensRegex = () => /^(\()((.|\n)*)$/
const closeParensRegex = () => /^(\))((.|\n)*)$/
const commaRegex = () => /^(,)((.|\n)*)$/
const colonRegex = () => /^(:)((.|\n)*)$/
const singleLineCommentRegex = () => /^((\/\/)(.*)(\n|))((.|\n)*)$/
const multiLineCommentRegex = () => /^((\/\*)((.|\n)*?)(\*\/))((.|\n)*)$/
const nullRegex = () => /^(null)((.|\n)*)$/
const deleteRegex = () => /^(delete)((.|\n)*)$/
const regexRegex = () =>
  /^(\/((.)+)\/((?!(?:.\B)*(.)(?:\B.)*\5)[gmuiy]+\b)*)((.|\n)*)$/
const equalSignRegex = () => /^(\s+=\s+)((.|\n)*)$/
const thinArrowRegex = () => /^(\s*->\s+)((.|\n)*)$/
const reverseBindRegex = () => /^(\s*<-\s+)((.|\n)*)$/
const slashRegex = () => /^(\s*\\)((.|\n)*)$/
const letRegex = () => /^(\s*let\s+)((.|\n)*)$/
const inRegex = () => /^(\s*in\s+)((.|\n)*)$/
const dotRegex = () => /^(\.)((.|\n)*)$/
const ifRegex = () => /^(if\s+)((.|\n)*)$/
const thenRegex = () => /^(then\s+)((.|\n)*)$/
const elseRegex = () => /^(else\s+)((.|\n)*)$/
const doRegex = () => /^(do)((.|\n)*)$/
const returnKeywordRegex = () => /^(return)((.|\n)*)$/
const includeKeywordRegex = () => /^(include)((.|\n)*)$/
const definePropRegex = () => /^(defineProp)((.|\n)*)$/
const libNameRegex = () => /^(node-core|browser-core)((.|\n)*)$/

/*
  All required parsers are created below
*/
const idParser = (input) => parser.regex(idRegex)(input)

const numParser = (input) => parser.regex(numRegex)(input)

const spaceParser = (input) => parser.regex(spaceRegex)(input)

const equalSignParser = (input) => parser.regex(equalSignRegex)(input)

const thinArrowParser = (input) => parser.regex(thinArrowRegex)(input)

const reverseBindParser = (input) => parser.regex(reverseBindRegex)(input)

const slashParser = (input) => parser.regex(slashRegex)(input)

const letParser = (input) => parser.regex(letRegex)(input)

const inParser = (input) => parser.regex(inRegex)(input)

const dotParser = (input) => parser.regex(dotRegex)(input)

const ifParser = (input) => parser.regex(ifRegex)(input)
const thenParser = (input) => parser.regex(thenRegex)(input)
const elseParser = (input) => parser.regex(elseRegex)(input)

const doParser = (input) => parser.regex(doRegex)(input)

const returnKeywordParser = (input) => parser.regex(returnKeywordRegex)(input)

const includeKeywordParser = (input) => parser.regex(includeKeywordRegex)(input)

const definePropParser = (input) => parser.regex(definePropRegex)(input)

const returnParser = (input) =>
  maybe(returnRegex().exec(input.str), (m, newLine, rest) =>
    returnRest(newLine, input, rest, { name: 'return', value: 1 })
  )

const numberParser = (input) =>
  maybe(numParser(input), (num, rest) => [estemplate.literal(num), rest])

const nonReservedIdParser = (input) =>
  maybe(idParser(input), (name, rest) =>
    isLanguageConstruct(name) ||
    isStaticIOMethod(name) ||
    isIOMethod(name) ||
    isDOMmethod(name)
      ? null
      : [estemplate.identifier(name), rest]
  )

const identifierParser = (input) =>
  maybe(idParser(input), (name, rest) => [estemplate.identifier(name), rest])

const document_ = (id) =>
  estemplate.memberExpression(
    estemplate.identifier('document'),
    estemplate.identifier(id)
  )

const domMethodParser = (input) =>
  maybe(idParser(input), (name, rest) =>
    !isDOMmethod(name) ? null : [document_(isDOMmethod(name)), rest]
  )

const ioFuncNameParser = (input) =>
  maybe(idParser(input), (name, rest) =>
    isStaticIOMethod(name) ? [estemplate.identifier(name), rest] : null
  )

const ioMethodNameParser = (input) =>
  maybe(idParser(input), (name, rest) =>
    isIOMethod(name) ? [estemplate.identifier(name), rest] : null
  )

const nullParser = (input) =>
  maybe(parser.regex(nullRegex)(input), (val, rest) => [
    estemplate.nullLiteral(val),
    rest
  ])

const stringParser = (input) =>
  maybe(parser.regex(stringRegex)(input), (string, rest) => [
    estemplate.stringLiteral(unescape(string)),
    rest
  ])

const booleanParser = (input) =>
  maybe(parser.regex(boolRegex)(input), (bool, rest) => [
    estemplate.boolLiteral(bool),
    rest
  ])

const regexParser = (input) =>
  maybe(regexRegex().exec(input.str), (m, regex, pattern, b, flags, _, rest) =>
    returnRest(estemplate.regex(regex, pattern, flags), input, rest, {
      name: 'column',
      value: pattern.length
    })
  )

const openParensParser = (input) =>
  maybe(parser.regex(openParensRegex)(input), (openParens, rest) => [
    openParens,
    rest
  ])

const closeParensParser = (input) =>
  maybe(parser.regex(closeParensRegex)(input), (closeParens, rest) => [
    closeParens,
    rest
  ])

const openCurlyBraceParser = (input) =>
  maybe(parser.regex(openCurlyRegex)(input), (openCurlyBrace, rest) => [
    openCurlyBrace,
    rest
  ])

const closeCurlyBraceParser = (input) =>
  maybe(parser.regex(closeCurlyRegex)(input), (closeCurlyBrace, rest) => [
    closeCurlyBrace,
    rest
  ])

const openSquareBracketParser = (input) =>
  maybe(
    parser.regex(openSquareBracketRegex)(input),
    (openSquareBracket, rest) => [openSquareBracket, rest]
  )

const closeSquareBracketParser = (input) =>
  maybe(
    parser.regex(closeSquareBracketRegex)(input),
    (closeSquareBracket, rest) => [closeSquareBracket, rest]
  )

const commaParser = (input) =>
  maybe(parser.regex(commaRegex)(input), (comma, rest) => [comma, rest])

const colonParser = (input) =>
  maybe(parser.regex(colonRegex)(input), (colon, rest) => [colon, rest])

const singleLineCommentParser = (input) =>
  maybe(singleLineCommentRegex().exec(input.str), (...vals) => {
    const [, comment, , , , rest] = vals
    const val = comment.slice(2)
    return returnRest(estemplate.comment('Line', val), input, rest, {
      name: 'return',
      value: 1
    })
  })

const multiLineCommentParser = (input) =>
  maybe(multiLineCommentRegex().exec(input.str), (...vals) => {
    const [, comment, , , , , rest] = vals
    const lineCount = notNull(comment.match(/\n/g))
      ? comment.match(/\n/g).length
      : 0
    const val = comment.slice(2, comment.length - 2)
    return returnRest(estemplate.comment('Block', val), input, rest, {
      name: 'return',
      value: lineCount
    })
  })

const binaryOperatorParser = (input) =>
  maybe(
    parser.all(
      maybeSpace,
      parser.regex(binaryOperatorRegex),
      maybeSpace
    )(input),
    (val, rest) => {
      const [sp1, op, sp2] = val
      return returnRest(op, input, rest.str, {
        name: 'column',
        value: (sp1 + op + sp2).length
      })
    }
  )

const unaryOperatorParser = (input) =>
  maybe(parser.regex(unaryOperatorRegex)(input), (operator, rest) => [
    operator,
    rest
  ])

const maybeSpace = (input) => {
  let val = ''
  const space = spaceParser(input)
  let rest = input
  if (notNull(space)) [val, rest] = space
  return returnRest(val, input, rest.str, {
    name: 'column',
    value: val.length
  })
}

const maybeNewLine = (input) =>
  maybe(parser.all(returnParser, spaceParser)(input), (val, rest) => [
    val,
    rest
  ])

const maybeNewLineAndIndent = (input) =>
  parser.any(maybeNewLine, maybeSpace)(input)

const libNameParser = (input) =>
  maybe(parser.regex(libNameRegex)(input), (val, rest) => [val, rest])

const includeParser = (input) =>
  maybe(
    parser.all(includeKeywordParser, spaceParser, libNameParser)(input),
    (val, rest) => [val[2], rest]
  )

const deleteKeywordParser = (input) =>
  maybe(parser.regex(deleteRegex)(input), (operator, rest) => [operator, rest])

const emptyArgsParser = (input) => {
  const result = parser.all(
    openParensParser,
    maybeSpace,
    closeParensParser
  )(input)
  if (isNull(result)) return null
  const [, rest] = result
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
  domMethodParser,
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
  returnKeywordParser,
  includeParser,
  deleteKeywordParser,
  emptyArgsParser,
  definePropParser
}
