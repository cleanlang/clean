const types = require('./operatorPrecedence')
let estemplate = {}

const extractExpr = token => token !== undefined && token.type === 'ExpressionStatement' ? token.expression : token

estemplate.error = msg => (
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
          'name': 'log'
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
)

estemplate.power = (base, exponent) => (
  {
    'type': 'CallExpression',
    'sType': 'number',
    'isPower': true,
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

const typeEqual = (first, second) => first.sType === second.sType

estemplate.concat = (val, arg) => (
  {
    'type': 'CallExpression',
    'sType': typeEqual(val, arg) && val.sType === 'string' ? 'string' : 'list',
    'callee': {
      'type': 'MemberExpression',
      'computed': false,
      'object': val,
      'property': {
        'type': 'Identifier',
        'name': 'concat'
      }
    },
    'arguments': [arg]
  }
)

estemplate.ast = () =>
  ({'type': 'Program', 'body': [], 'sourceType': 'script'})

estemplate.literal = value =>
  ({'type': 'Literal', 'value': Number(value), 'raw': value, 'sType': 'number'})

estemplate.nullLiteral = value =>
  ({'type': 'Literal', 'value': null, 'raw': value, 'sType': 'needsInference'})

estemplate.boolLiteral = value =>
    ({'type': 'Literal', 'value': !(value === 'false'), 'raw': value, 'sType': 'bool'})

estemplate.stringLiteral = value =>
  ({'type': 'Literal', 'value': value, 'raw': value, 'sType': 'string'})

estemplate.identifier = value =>
  ({'type': 'Identifier', 'name': value})

estemplate.assignment = (left, operator, right) => ({
  'type': 'AssignmentExpression',
  operator,
  left,
  right
})

estemplate.declaration = (id, val) => ({
  'type': 'VariableDeclaration',
  'declarations': [
    {
      'type': 'VariableDeclarator',
      id,
      'init': extractExpr(val)
    }
  ],
  'kind': 'const'
})

estemplate.funcDeclaration = (id, params, body) =>
  ({
    'type': 'VariableDeclaration',
    'declarations': [
      {
        'type': 'VariableDeclarator',
        id,
        'init': {
          'type': 'ArrowFunctionExpression',
          'id': null,
          'params': params,
          'body': extractExpr(body) || '',
          'generator': false,
          'expression': (body === undefined || body.type !== 'BlockStatement')
        }
      }
    ],
    'kind': 'const'
  })

estemplate.lambdaCall = (params, args, body) =>
  ({
    'type': 'CallExpression',
    'callee': {
      'type': 'ArrowFunctionExpression',
      'id': null,
      'params': params,
      'body': extractExpr(body) || '',
      'generator': false,
      'expression': true
    },
    'arguments': args.map(extractExpr)
  }
  )

estemplate.letExpression = (params, args, body) =>
  ({
    'type': 'CallExpression',
    'callee': {
      'type': 'ArrowFunctionExpression',
      'id': null,
      'params': params,
      'body': extractExpr(body) || '',
      'generator': false,
      'expression': true
    },
    'arguments': args.map(extractExpr)
  }
  )

estemplate.memberExpression = (obj, prop) =>
  ({
    'type': 'ExpressionStatement',
    'expression': {
      'type': 'MemberExpression',
      'computed': false,
      'object': extractExpr(obj),
      'property': extractExpr(prop)
    }
  })

estemplate.subscriptExpression = (obj, prop) =>
  ({
    'type': 'ExpressionStatement',
    'expression': {
      'type': 'MemberExpression',
      'computed': true,
      'object': extractExpr(obj),
      'property': extractExpr(prop)
    }
  })

estemplate.fnCall = (val, args) => ({
  'type': 'CallExpression',
  'callee': extractExpr(val),
  'arguments': args.map(extractExpr)
})

estemplate.lambda = (params, body) =>
  ({
    'type': 'ExpressionStatement',
    'expression': {
      'type': 'ArrowFunctionExpression',
      'id': null,
      params,
      'body': extractExpr(body) || '',
      'generator': false,
      'expression': (body === undefined || body.type !== 'BlockStatement')
    }
  })

estemplate.binaryExpression = (left, op, right) => {
  let opType = types[op].type
  if (op === '^') return estemplate.power(left, right)
  if (op === '++') return binaryExpr(left, '+', right, opType)
  if (op === '==') return binaryExpr(left, '===', right, opType)
  if (op === '!=') return binaryExpr(left, '!==', right, opType)
  return binaryExpr(left, op, right, opType)
}

const binaryExpr = (left, op, right, opType) => ({
  'type': 'BinaryExpression',
  'operator': op,
  'sType': opType,
  'left': extractExpr(left),
  'right': extractExpr(right)
})

estemplate.unaryExpression = (op, arg) => (
  {
    'type': 'UnaryExpression',
    'operator': op,
    'argument': extractExpr(arg),
    'prefix': true
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
    'test': extractExpr(condition),
    'consequent': extractExpr(result1),
    'alternate': extractExpr(result2)
  }
})

estemplate.array = elements => ({'type': 'ArrayExpression', elements})

estemplate.object = value => ({
  'type': 'ObjectExpression',
  'properties': extractExpr(value)
})

estemplate.objectProperty = (key, val) => ({
  'type': 'Property',
  'key': key,
  'computed': false,
  'value': extractExpr(val),
  'kind': 'init',
  'method': false,
  'shorthand': false
})

estemplate.comment = (type, val) => ({
  'type': type,
  'value': val
})

estemplate.ioDo = {
  'type': 'VariableDeclaration',
  'declarations': [
    {
      'type': 'VariableDeclarator',
      'id': {
        'type': 'Identifier',
        'name': 'IO'
      },
      'init': {
        'type': 'CallExpression',
        'callee': {
          'type': 'Identifier',
          'name': 'require'
        },
        'arguments': [
          {
            'type': 'Literal',
            'value': 'io-square-node',
            'raw': 'io-square-node'
          }
        ]
      }
    }
  ],
  'kind': 'const'
}

estemplate.ioCall = (ioFunc, arg, nextParams = []) => ({
  'type': 'CallExpression',
  'callee': {
    'type': 'MemberExpression',
    'computed': false,
    'object': {
      'type': 'Identifier',
      'name': 'IO'
    },
    'property': ioFunc
  },
  'arguments': [arg],
  nextParams
})

estemplate.ioBind = (parentIO, ioCall, nextParams = []) => ({
  'type': 'CallExpression',
  'callee': {
    'type': 'MemberExpression',
    'computed': false,
    'object': parentIO,
    'property': {
      'type': 'Identifier',
      'name': 'bind'
    }
  },
  'arguments': [ioCall],
  nextParams
})

estemplate.ioMap = (parentIO, pureFunc, nextParams = []) => ({
  'type': 'CallExpression',
  'callee': {
    'type': 'MemberExpression',
    'computed': false,
    'object': parentIO,
    'property': {
      'type': 'Identifier',
      'name': 'map'
    }
  },
  'arguments': [pureFunc],
  nextParams
})

estemplate.ioThen = (parentIO, func, ioParams) => ({
  'type': 'CallExpression',
  'callee': {
    'type': 'MemberExpression',
    'computed': false,
    'object': parentIO,
    'property': {
      'type': 'Identifier',
      'name': 'then'
    }
  },
  'arguments': [func],
  ioParams
})

estemplate.ioPutLine = (parentIO, args, ioParams) => ({
  'type': 'CallExpression',
  'callee': {
    'type': 'MemberExpression',
    'computed': false,
    'object': {
      'type': 'CallExpression',
      'callee': {
        'type': 'MemberExpression',
        'computed': false,
        'object': parentIO,
        'property': {
          'type': 'Identifier',
          'name': 'bind'
        }
      },
      'arguments': [
        {
          'type': 'ArrowFunctionExpression',
          'id': null,
          'params': ioParams,
          'body': {
            'type': 'BlockStatement',
            'body': [
              {
                'type': 'ReturnStatement',
                'argument': {
                  'type': 'CallExpression',
                  'callee': {
                    'type': 'MemberExpression',
                    'computed': false,
                    'object': {
                      'type': 'Identifier',
                      'name': 'IO'
                    },
                    'property': {
                      'type': 'Identifier',
                      'name': 'putLine'
                    }
                  },
                  'arguments': args
                }
              }
            ]
          },
          'generator': false,
          'expression': false
        }
      ]
    },
    'property': {
      'type': 'Identifier',
      'name': 'map'
    }
  },
  'arguments': [
    {
      'type': 'ArrowFunctionExpression',
      'id': null,
      'params': ioParams,
      'body': {
        'type': 'BlockStatement',
        'body': [
          {
            'type': 'ReturnStatement',
            'argument': {
              'type': 'ArrayExpression',
              'elements': ioParams
            }
          }
        ]
      },
      'generator': false,
      'expression': false
    }
  ],
  'nextParams': ioParams
})

estemplate.returnStmt = (args) => ({
  'type': 'ReturnStatement',
  'argument': {
    'type': 'ArrayExpression',
    'elements': args
  }
})

estemplate.defaultIOThen = parentObj => ({
  'type': 'CallExpression',
  'callee': {
    'type': 'MemberExpression',
    'computed': false,
    'object': parentObj,
    'property': {
      'type': 'Identifier',
      'name': 'then'
    }
  },
  'arguments': [
    {
      'type': 'ExpressionStatement',
      'expression': {
        'type': 'ArrowFunctionExpression',
        'id': null,
        'params': [
          {
            'type': 'Identifier',
            'name': 'data'
          }
        ],
        'body': {
          'type': 'BlockStatement',
          'body': {
            'type': 'ReturnStatement',
            'argument': {
              'type': 'ArrayExpression',
              'elements': [
                {
                  'type': 'Identifier',
                  'name': 'data'
                }
              ]
            }
          }
        },
        'generator': false,
        'expression': false
      }
    }
  ]
})

/*  Module Exports estemplate  */
module.exports = estemplate
