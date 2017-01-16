const types = require('./operatorPrecedence')
let estemplate = {}

estemplate.error = msg => (
  {
    'interrupt': true,
    'type': 'Program',
    'body': [
      {
        'type': 'ExpressionStatement',
        'expression': {
          'type': 'CallExpression',
          'callee': {
            'type': 'MemberExpression',
            'computed': false,
            'object': {
              'type': 'Identifier',
              'name': 'console'
            },
            'property': {
              'type': 'Identifier',
              'name': 'error'
            }
          },
          'arguments': [
            {
              'type': 'Literal',
              'value': msg,
              'raw': msg
            }
          ]
        }
      }
    ],
    'sourceType': 'script'
  }
)

estemplate.power = (base, exponent) => (
  {
    'type': 'CallExpression',
    'sType': 'number',
    'callee': {
      'type': 'MemberExpression',
      'computed': false,
      'object': {
        'type': 'Identifier',
        'name': 'Math'
      },
      'property': {
        'type': 'Identifier',
        'name': 'pow'
      }
    },
    'arguments': [base, exponent]
  }
)

estemplate.ast = () =>
  ({type: 'Program', body: [], sourceType: 'script'})

estemplate.literal = value =>
  ({type: 'Literal', value: Number(value), raw: value, sType: 'number'})

estemplate.boolLiteral = value =>
    ({type: 'Literal', value: value === 'false' ? false : true , raw: value, sType: 'bool'})

estemplate.stringLiteral = value =>
  ({type: 'Literal', value: value, raw: value, sType: 'string'})

estemplate.identifier = value =>
  ({type: 'Identifier', name: value})

estemplate.declaration = (id, val) => {
  if (val.interrupt !== undefined && val.interrupt) return val
  return ({
    type: 'VariableDeclaration',
    declarations: [
      {
        type: 'VariableDeclarator',
        id: id,
        init: val
      }
    ],
    kind: 'const'
  })
}

estemplate.funcDeclaration = (...val) =>
  ({
    type: 'VariableDeclaration',
    declarations: [
      {
        type: 'VariableDeclarator',
        id: val[0],
        init: {
          type: 'ArrowFunctionExpression',
          id: null,
          params: val[1],
          body: val[2] || '',
          generator: false,
          expression: true
        }
      }
    ],
    kind: 'const'
  })

estemplate.letExpression = (...val) =>
  ({
    type: 'ExpressionStatement',
    expression: {
      type: 'CallExpression',
      callee: {
        'type': 'ArrowFunctionExpression',
        id: null,
        params: val[0],
        body: val[2] || '',
        generator: false,
        expression: true
      },
      arguments: val[1]
    }
  })

estemplate.memberExpression = (obj, prop) =>
  ({
    type: 'ExpressionStatement',
    expression: {
      type: 'MemberExpression',
      computed: false,
      object: obj,
      property: prop
    }
  })

estemplate.fnCall = (val, args) =>
  ({type: 'CallExpression', callee: val, arguments: args})

estemplate.lambda = (...val) =>
  ({
    type: 'ExpressionStatement',
    expression: {
      type: 'ArrowFunctionExpression',
      id: null,
      params: val[0],
      body: val[1] || '',
      generator: false,
      expression: true
    }
  })

const checkType = (left, op, right) => left.sType === right.sType
      ? types[op].type === 'all' || types[op].type === left.sType : false

estemplate.binaryExpression = (left, op, right, line) => {
  if (checkType(left, op, right)) {
    let opType = types[op].type
    return op === '^' ? estemplate.power(left, right) : ({
      type: 'BinaryExpression',
      operator: op === '==' ? '===' : op,
      sType: opType === 'all' ? 'bool' : opType,
      left: left,
      right: right
    })
  }
  return estemplate.error(`Type Error at line: ${line}`)
}

estemplate.printexpression = (args) => ({
  'type': 'ExpressionStatement',
  'expression': {
    'type': 'CallExpression',
    'callee': {
      'type': 'MemberExpression',
      'computed': false,
      'object': {
        'type': 'Identifier',
        'name': 'console'
      },
      'property': {
        'type': 'Identifier',
        'name': 'log'
      }
    },
    'arguments': args
  }
})

estemplate.unaryExpression = (op, arg) => (
  {
    type: 'UnaryExpression',
    operator: op,
    argument: arg,
    prefix: true
  }
)

estemplate.blockStmt = body => ({
  'type': 'BlockStatement',
  'body': body
})

estemplate.ifthenelse = (condition, result1, result2) => ({
  'type': 'ExpressionStatement',
  'expression': {
    'type': 'ConditionalExpression',
    'test': condition,
    'consequent': result1,
    'alternate': result2
  }
})
/*  Module Exports estempla[te  */
module.exports = estemplate
