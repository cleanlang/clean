const test = require('tape')
const parser = require('../lib/parser')
const fs = require('fs')
const src = fs.readFileSync('tests/test.cl', 'utf8').toString()
// const estemplate = require('../lib/template')
let expected = {
  'type': 'Program',
  'body': [
    {
      'type': 'VariableDeclaration',
      'declarations': [
        {
          'type': 'VariableDeclarator',
          'id': {
            'type': 'Identifier',
            'name': 'fact'
          },
          'init': {
            'type': 'ArrowFunctionExpression',
            'id': null,
            'params': [
              {
                'type': 'Identifier',
                'name': 'n'
              }
            ],
            'body': {
              'type': 'BlockStatement',
              'body': [
                {
                  'type': 'SwitchStatement',
                  'discriminant': {
                    'type': 'Identifier',
                    'name': 'n'
                  },
                  'cases': [
                    {
                      'type': 'SwitchCase',
                      'test': {
                        'type': 'Literal',
                        'value': 0,
                        'raw': '0'
                      },
                      'consequent': [
                        {
                          'type': 'ReturnStatement',
                          'argument': {
                            'type': 'Literal',
                            'value': 0,
                            'raw': '0'
                          }
                        }
                      ]
                    },
                    {
                      'type': 'SwitchCase',
                      'test': {
                        'type': 'Literal',
                        'value': 1,
                        'raw': '1'
                      },
                      'consequent': [
                        {
                          'type': 'ReturnStatement',
                          'argument': {
                            'type': 'Literal',
                            'value': 1,
                            'raw': '1'
                          }
                        }
                      ]
                    },
                    {
                      'type': 'SwitchCase',
                      'test': null,
                      'consequent': [
                        {
                          'type': 'ReturnStatement',
                          'argument': {
                            'type': 'BinaryExpression',
                            'operator': '*',
                            'left': {
                              'type': 'Identifier',
                              'name': 'n'
                            },
                            'right': {
                              'type': 'CallExpression',
                              'callee': {
                                'type': 'Identifier',
                                'name': 'fact'
                              },
                              'arguments': [
                                {
                                  'type': 'BinaryExpression',
                                  'operator': '-',
                                  'left': {
                                    'type': 'Identifier',
                                    'name': 'n'
                                  },
                                  'right': {
                                    'type': 'Literal',
                                    'value': 1,
                                    'raw': '1'
                                  }
                                }
                              ]
                            }
                          }
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            'generator': false,
            'expression': false
          }
        }
      ],
      'kind': 'const'
    },
    {
      'type': 'ExpressionStatement',
      'expression': {
        'type': 'CallExpression',
        'callee': {
          'type': 'Identifier',
          'name': 'print'
        },
        'arguments': [
          {
            'type': 'CallExpression',
            'callee': {
              'type': 'Identifier',
              'name': 'fact'
            },
            'arguments': [
              {
                'type': 'Literal',
                'value': 5,
                'raw': '5'
              }
            ]
          }
        ]
      }
    }
  ],
  'sourceType': 'script'
}

test('parser', t => {
  t.plan(1)
  t.deepEqual(parser(src), expected, 'Program Parser')
})
