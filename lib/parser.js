/*
  Parser
  Parses clean source. Generates clean AST.
*/
const opPrec = require('./operatorPrecedence')
const estemplate = require('./estemplate')
const updateAst = require('./astupdate')

/*  Utility functions  */
const mayBe = (value, func) => value === null ? null : func(...value)
const precedence = operator => opPrec[operator].prec
const associativity = operator => opPrec[operator].assoc
const lookAhead = src => {
  let match = parser.all(spaceParser, binaryOperatorParser, spaceParser)(src)
  if (match !== null) {
    let [[, operator], remaining] = match
    return [operator, remaining]
  }
  return null
}
// Predifined regexes

/*  Predifined regexes */
const spaceRegex = /^( +)((.|\n)*)$/
const returnRegex = /^(\n+)((.|\n)*)$/
const idRegex = /^([a-zA-Z]+[a-zA-Z0-9_]*)((.|\n)*)$/
const numRegex = /^([-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[e][+-]?\d+)?)((.|\n)*)$/
const boolRegex = /^(true|false)((.|\n)*)$/i
const stringRegex = /^('[^\\']*(?:\\.[^\\']*)*')((.|\n)*)$/
// var argsRegex = /^([^=]*)((.|\n)*)$/
const binaryOperatorRegex = /^(\+|-|\/|\*|<<|<=|<|>>>|>>|>=|>|&&|&|\|\||\||\^|==)(?=\s)((.|\n)*)$/
const conditionalOperatorRegex = /^(<<|<=|<|>>>|>>|>=|>|&&|&|==)(?=\s)((.|\n)*)$/
// var nullRegEx       = /^null\b/i
const unaryOperatorRegex = /^(:type|-|!)((.|\n)*)$/
 // /^(:type(?=\s)|(-|!)(?!\s))((.|\n)*)$/

/*
  Parser factory. Used to create parsers
  parser.regex - creates parser for given regex
  parser.bind - applies monadic bind on parsers
  parser.all - All parsers supplied MUST match
  parser.any - ANY ONE of the parsers need match
*/

const parser = {}

var returnRest = (val, input, rest, field) => {
  const output = JSON.parse(JSON.stringify(input))
  // output.indent = 0
  if (field) {
    switch (field.name) {
      case 'indent':
        output.indent = field.value
        break
      case 'return':
        output.column = 1
        output.line += field.value
        break
      case 'column':
        output.column += field.value
        break
    }
  }
  output.str = rest
  return [val, output]
}

parser.regex = regex => src => mayBe(
  regex.exec(src.str),
  (m, val, rest) => returnRest(val, src, rest, {'name': 'column', 'value': val.length})
)

parser.bind = (mv, mf) => input => mayBe(
  mv(input),
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
var spaceParser = parser.regex(/^( +)((.|\n)*)$/)

// var returnParser = parser.regex(/^(\n+)((.|\n)*)$/)

var equalSignParser = parser.regex(/^(\s+=\s+)((.|\n)*)$/)

var thinArrowParser = parser.regex(/^(\s*->\s+)((.|\n)*)$/)

var slashParser = parser.regex(/^(\s*\\)((.|\n)*)$/)

var letParser = parser.regex(/^(\s*let\s+)((.|\n)*)$/)

var inParser = parser.regex(/^(\s*in\s+)((.|\n)*)$/)

var dotParser = parser.regex(/^(\.)((.|\n)*)$/)

var prntParser = parser.regex(/^(print\s+)((.|\n)*)$/)

var ifParser = parser.regex(/^(if\s+)((.|\n)*)$/)

var thenParser = parser.regex(/^(then\s+)((.|\n)*)$/)

var elseParser = parser.regex(/^(else\s+)((.|\n)*)$/)

var indentParser = input =>  mayBe(
    spaceRegex.exec(input.str),
    (a, space, rest) => returnRest(space, input, rest, {'name': 'indent', 'value': space.length})
  ) || returnRest (null, input, input.str, {'name': 'indent', 'value': 0})

var returnParser = input => mayBe(
  returnRegex.exec(input.str),
  (a, newLine, rest) => returnRest(newLine, input, rest, {'name': 'return', 'value': newLine.length})
)

var numberParser = input => mayBe(
  numRegex.exec(input.str),
  (a, num, rest) => returnRest(estemplate.literal(num, num), input, rest, {'name': 'column', 'value': num.length})
)

var identifierParser = input => mayBe(
  idRegex.exec(input.str),
  (a, name, rest) => returnRest(estemplate.identifier(name), input, rest, {'name': 'column', 'value': name.length})
)

var stringParser = input => mayBe(
  stringRegex.exec(input.str),
  (a, string, rest) => returnRest(estemplate.stringLiteral(string.replace(/(^')/, '').replace(/('$)/, '')),
                                    input, rest, {'name': 'column', 'value': string.length})
)

var booleanParser = input => mayBe(
    boolRegex.exec(input.str),
    (a, bool, rest) => {
      input.str = rest
      return [estemplate.boolLiteral(bool), input]
    }
  )

var parenthesisParser = parser.bind(
  parser.bind(
  parser.bind(
  parser.bind(
    input => input.str.startsWith('(')
      ? returnRest('(', input, input.str.substr(1), {'name': 'column', 'value': 1})
      : null,
    val => input => {
      const space = spaceParser(input)
      return space ? [space[0], space[1]] : [null, input]
    }),
    val => input => mayBe(
      parser.any(binaryExprParser, fnCallParser, expressionParser)(input),
      (v, rest) => returnRest(v, input, rest.str)
    )),
    val => input => {
      var space = spaceParser(input)
      return space ? [val, space[1]] : [val, input]
    }),
    val => input => input.str.startsWith(')')
      ? returnRest(val, input, input.str.substr(1), {'name': 'column', 'value': 1})
      : null
)

var expressionParser = parser.any(parenthesisParser, booleanParser, identifierParser, numberParser, stringParser)

var unaryOperatorParser = parser.regex(unaryOperatorRegex)

var unaryExprParser = parser.bind(
  parser.bind(
    unaryOperatorParser,
    operator => rest => operator === ':type'
      ? spaceParser(rest) !== null ? ['typeof', spaceParser(rest)[1]] : null
      : [operator, rest]),
  operator => rest => mayBe(expressionParser(rest),
    (argument, rest) => [estemplate.unaryExpression(operator, argument), rest])
)

var binaryOperatorParser = parser.regex(binaryOperatorRegex)
var conditionalOperatorParser = parser.regex(conditionalOperatorRegex)

var conditionParser = src => {
  let op = parser.all(parser.any(parenthesisParser, fnCallParser, identifierParser),
  spaceParser,
  conditionalOperatorParser,
  spaceParser,
  parser.any(numberParser, stringParser, booleanParser, identifierParser))(src)

  if (op === null) return null

  let testobj = formConditionObject(op)
  return [testobj, op[1]]
}

const formConditionObject = op => {
  let testobj = {'type': 'BinaryExpression'}
  testobj.operator = op[0][2].replace(/==/, '===')

  if (op[0][0].type === 'ExpressionStatement') {
    op[0][0] = op[0][0].expression
  }
  testobj.left = op[0][0]
  testobj.right = op[0][4]

  return testobj
}

var binaryExprParser = src => {
  var biExpr = estemplate.binaryExpression
  let result = parser.all(
                          parser.any(fnCallParser, expressionParser),
                          spaceParser,
                          binaryOperatorParser,
                          spaceParser,
                          parser.any(fnCallParser, expressionParser))(src)
  if (result === null) return null

  let [[leftOperand, , firstOperator, , rightOperand], rest] = result.map(
    elem => typeof elem === 'object' ? elem.hasOwnProperty('str')
        ? elem
        : elem.map(val => val.type !== undefined && val.type === 'ExpressionStatement' ? val.expression : val)
      : elem)

  if (lookAhead(rest) === null) {
    return [biExpr(leftOperand, firstOperator, rightOperand), rest]
  }

  let [nextOperator, possibleExpr] = lookAhead(rest)
  let p = parser.any(binaryExprParser, expressionParser)(possibleExpr)
  if (p === null) return null
  let [nextExpr, remaining] = p

  if (precedence(nextOperator) < precedence(firstOperator)) {
    return [
      biExpr(
        biExpr(leftOperand, firstOperator, rightOperand),
        nextOperator,
        nextExpr),
      remaining]
  }

  if (precedence(nextOperator) > precedence(firstOperator)) {
    return (nextExpr.type === 'BinaryExpression') &&
      (precedence(nextExpr.operator) < precedence(nextOperator))
       ? [
         biExpr(
           biExpr(
             leftOperand,
             firstOperator,
             biExpr(rightOperand, nextOperator, nextExpr.left)),
           nextExpr.operator,
           nextExpr.right),
         remaining]
      : [
        biExpr(
          leftOperand,
          firstOperator,
          biExpr(rightOperand, nextOperator, nextExpr)),
        remaining]
  }

  return associativity(firstOperator) === 'R'
    ? [
      biExpr(
        leftOperand,
        firstOperator,
        biExpr(rightOperand, nextOperator, nextExpr)),
      remaining]
    : [
      biExpr(
        biExpr(leftOperand, firstOperator, rightOperand),
        nextOperator,
        nextExpr),
      remaining]
}

var declParser = parser.bind(
  parser.bind(
    identifierParser,
    val => input => mayBe(
        equalSignParser(input),
        (v, rest) => [val, rest]
      )
  ),
  val => input => mayBe(
        parser.any(binaryExprParser, fnCallParser, expressionParser)(input),
        (v, rest) => {
          return returnRest(estemplate.declaration(val, v), input, rest.str)
        }
      )
)

var paramParser = parser.all(spaceParser, parser.any(identifierParser, numberParser))

var paramsParser = (str, paramArray = []) => {
  var param = paramParser(str)
  return (param !== null) ? paramsParser(param[1], paramArray.concat(param[0][1]))
                          : [paramArray, str]
}

var fnDeclParser = parser.bind(
  parser.bind(
    parser.bind(
      identifierParser,
      val => input => mayBe(
        paramsParser(input),
        (params, rest) => returnRest(estemplate.funcDeclaration(val, params), input, rest.str)
      )
    ),
    val => input => mayBe(
        equalSignParser(input),
        (v, rest) => [val, rest]
      )
  ),
  val => input => mayBe(
      parser.any(binaryExprParser, fnCallParser, expressionParser)(input),
      (v, rest) => {
        val.declarations[0].init.body = v
        return returnRest(val, input, rest.str)
      }
    )
)

var lambdaParamParser = parser.all(identifierParser, spaceParser)

var lambdaParamsParser = (str, lambdaparamArray = []) => {
  var arg = lambdaParamParser(str)
  if (arg !== null) return lambdaParamsParser(arg[1], lambdaparamArray.concat(arg[0][0]))
  return [lambdaparamArray, str]
}

var lambdaParser = parser.bind(
  parser.bind(
    parser.bind(
      slashParser,
      val => input => mayBe(
        lambdaParamsParser(input),
        (params, rest) => returnRest(estemplate.lambda(params), input, rest.str)
       )
      ),
    val => input => mayBe(
      thinArrowParser(input),
      (v, rest) => returnRest(val, input, rest.str)
    )
   ),
   val => input => mayBe(
     expressionParser(input),
     (v, rest) => {
       val.expression.body = v
       return returnRest(val, input, rest.str)
     }
   )
 )

var letParamParser = parser.all(expressionParser, equalSignParser, expressionParser, spaceParser)

var letParamsParser = (str, letIdArray = [], letLiteralArray = []) => {
  var param = letParamParser(str)
  if (param !== null) return letParamsParser(param[1], letIdArray.concat(param[0][0]), letLiteralArray.concat(param[0][2]))
  return [letIdArray, letLiteralArray, str]
}

var letExpressionParser = parser.bind(
  parser.bind(
    parser.bind(
      letParser,
      val => input => mayBe(
        letParamsParser(input),
        (val1, val2, rest) => returnRest(estemplate.letExpression(val1, val2), input, rest.str)
     )
    ),
    val => input => mayBe(
      inParser(input),
      (v, rest) => returnRest(val, input, rest.str)
    )
  ),
  val => input => mayBe(parser.any(binaryExprParser, fnCallParser, expressionParser)(input),
    (v, rest) => {
      val.expression.callee.body = v
      return returnRest(val, input, rest.str)
    }
  )
)

var memberPropParser = parser.all(identifierParser, dotParser)

var memberPropsParser = (str, memberArray = []) => {
  var result = memberPropParser(str)
  if (result !== null) return memberPropsParser(result[1], memberArray.concat(result[0][0]))
  if (result === null && memberArray.length === 0) return null
  var property = identifierParser(str)
  if (property === null) return null
  let tree = memberExprParser(memberArray.concat(property[0]))
  return [tree, property[1]]
}

var memberExprParser = (str, tree = {}) => {
  let memExpr = estemplate.memberExpression
  tree = memExpr(str[0], str[1])
  for (let i = 2; i < str.length; i++) {
    tree = memExpr(tree.expression, str[i])
  }
  return tree
}

var parenCheck = str => str[0] === ')' ? [')', str] : null

var argsParser = (input, argArray = []) => {
  let newLineFlag = 0
  var arg = parser.all(expressionParser, parser.any(returnParser, parenCheck))(input) ||
            parser.bind(expressionParser, val => input => {
              const space = spaceParser(input)
              return space ? [val, space[1]] : [val, input]
            })(input)
  if (arg === null) return argArray.length === 0 ? null : [argArray, input]
  if (arg[0][0]) {
    arg[0] = arg[0][0]
    newLineFlag = 1
  }
  if (binaryOperatorRegex.exec(arg[1].str) !== null) arg[1].str = ' ' + arg[1].str
  if (arg[0].type === 'ExpressionStatement') arg[0] = arg[0].expression
  if (newLineFlag) return [argArray.concat(arg[0]), arg[1]]
  return argsParser(arg[1], argArray.concat(arg[0]))
}

var printParser = parser.bind(
    prntParser,
    val => input => mayBe(
      argsParser(input),
      (args, rest) => returnRest(estemplate.printexpression(args), input, rest.str)
    )
)

var fnCallParser = parser.bind(
  parser.all(parser.any(memberPropsParser, identifierParser), spaceParser),
  val => input => mayBe(
    argsParser(input),
    (args, rest) => val[1] === 'n' ? null : val[0].type === 'ExpressionStatement'
    ? returnRest(estemplate.fnCall(val[0].expression, args), input, rest.str)
    : returnRest(estemplate.fnCall(val[0], args), input, rest.str)
  )
)

var ifExprParser = parser.bind(
  parser.bind(
  parser.bind(
  parser.bind(
    parser.all(ifParser, conditionParser),
    val => input => mayBe(
      parser.all(spaceParser, thenParser)(input),
      (v, rest) => returnRest(val[1], input, rest.str)
    )),
    val => input => mayBe(
      parser.any(binaryExprParser, fnCallParser, expressionParser)(input),
      (v, rest) => returnRest([val, v], input, rest.str)
    )),
    val => input => mayBe(
      parser.all(spaceParser, elseParser)(input),
      (v, rest) => returnRest(val, input, rest.str)
    )),
    val => input => mayBe(
      parser.any(binaryExprParser, fnCallParser, expressionParser)(input),
      (v, rest) => returnRest(estemplate.ifthenelse(val[0], val[1], v), input, rest.str)
    )
)

var statementParser = parser.any(returnParser, printParser, ifExprParser, letExpressionParser, declParser, fnDeclParser, fnCallParser, lambdaParser)

var programParser = (input, ast = estemplate.ast()) => {
  let result = statementParser(input)
  if (result === null) {
    return updateAst(ast)
  }
  if (typeof result[0] !== 'string') ast.body.push(result[0])
  return programParser(result[1], ast)
}
var multiLineParser = src => {
  let blockStmt = estemplate.blockStmt
  let result = parser.all(indentParser, statementParser)(src)
  if (result === null) return null
  let [[, stmt], nextLine] = result
  let {indent} = nextLine
  let pa          = indentParser(nextLine)
  return nextIndent
}

console.log(multiLineParser({str : 'f a b = print a\n print b', indent: 0 , column : 0, line : 1}))

/*  Module Exports programParser  */
module.exports = programParser
