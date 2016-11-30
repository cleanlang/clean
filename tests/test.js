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
                'type': 'Literal',
                'value': 1,
                'raw': '1'
              }
            ],
            'body': {
              'type': 'Literal',
              'value': 1,
              'raw': '1'
            },
            'generator': false,
            'expression': true
          }
        }
      ],
      'kind': 'const'
    },
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
            },
            'generator': false,
            'expression': true
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
    },
    {
      'type': 'ExpressionStatement',
      'expression': {
        'type': 'CallExpression',
        'callee': {
          'type': 'Identifier',
          'name': 'fact'
        },
        'arguments': [
          {
            'type': 'Literal',
            'value': 10,
            'raw': '10'
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
