const test = require('tape')
const parser = require('../lib/parser')
const fs = require('fs')
<<<<<<< HEAD
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
            'type': 'BinaryExpression',
            'operator': '+',
            'left': {
              'type': 'Literal',
              'value': 7,
              'raw': '7'
            },
            'right': {
              'type': 'Literal',
              'value': 2,
              'raw': '2'
            }
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
    }

  ],
  'sourceType': 'script'
}
=======
const src = fs.readFileSync('test.cl', 'utf8').toString()
const estemplate = require('../lib/template')
let expected = estemplate.ast()
expected.body = [
  estemplate.declaration(estemplate.identifier('a'), estemplate.literal('7')),
  estemplate.funcDeclaration(estemplate.identifier('f'),
    [estemplate.identifier('a'), estemplate.identifier('b')],
    estemplate.literal('1')),
  estemplate.fnCall(estemplate.identifier('f'),
    [estemplate.literal('5'), estemplate.literal('1')]),
  estemplate.lambda([estemplate.identifier('a'), estemplate.identifier('b')],
    estemplate.literal('6'))
]
>>>>>>> ebcd8e7d79c7f615bc3ea0d310093cea91b22d54

test('parser', t => {
  t.plan(1)
  t.deepEqual(parser(src), expected, 'Program Parser')
})
