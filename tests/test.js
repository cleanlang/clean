const test = require('tape')
const parser = require('../lib/parser')
const fs = require('fs')
const src = fs.readFileSync('test.cl', 'utf8').toString()
const estemplate = require('../lib/template')
let expected = estemplate.ast()
expected.body = [
  estemplate.declaration(estemplate.identifier('a'), estemplate.literal('7')),
  estemplate.funcDeclaration(estemplate.identifier('f'),
    [estemplate.identifier('a'), estemplate.identifier('b')],
    estemplate.literal('1')),
  estemplate.fnCall(estemplate.identifier('f'),
    [estemplate.literal('5'), estemplate.literal('1')])
]

test('parser', t => {
  t.plan(1)
  t.deepEqual(parser(src), expected, 'Program Parser')
})
