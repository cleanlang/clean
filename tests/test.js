const test = require('tape')
const parser = require('../lib/parser')
const fs = require('fs')
const src = fs.readFileSync('tests/test.cl', 'utf8').toString()
const expected = {
  'type': 'Program',
  'body': [
    {
      'type': 'VariableDeclaration',
      'declarations': [
        {
          'type': 'VariableDeclarator',
          'id': {
            'type': 'Identifier',
            'name': 'a'
          },
          'init': {
            'type': 'Literal',
            'value': 7,
            'raw': '7'
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
            'name': 'f'
          },
          'init': {
            'type': 'ArrowFunctionExpression',
            'id': null,
            'params': [
              {
                'type': 'Identifier',
                'name': 'a'
              },
              {
                'type': 'Identifier',
                'name': 'b'
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
      'type': 'ExpressionStatement',
      'expression': {
        'type': 'CallExpression',
        'callee': {
          'type': 'Identifier',
          'name': 'f'
        },
        'arguements': [
          {
            'type': 'Literal',
            'value': 5,
            'raw': '5'
          },
          {
            'type': 'Literal',
            'value': 1,
            'raw': '1'
          }
        ]
      }
    },
    {
      'type': 'ExpressionStatement',
      'expression': {
        'type': 'ArrowFunctionExpression',
        'id': null,
        'params': [
          {
            'type': 'Identifier',
            'name': 'a'
          },
          {
            'type': 'Identifier',
            'name': 'b'
          }
        ],
        'body': {
          'type': 'Literal',
          'value': 6,
          'raw': '6'
        },
        'generator': false,
        'expression': true
      }
    }
  ],
  'sourceType': 'script'
}

test('parser', t => {
  t.plan(1)
  t.deepEqual(parser(src), expected, 'Program Parser')
})
