const test = require('ava')

/* lib files */
const base = require('../lib/basicParsers')
const templ = require('../lib/estemplate')
const utils = require('../lib/utilityFunctions')

/* test file with inputs and expected outputs */
const assertion = require('./basicAssertion')

const initInputObj = (input, line = 1, column = 0) => ({
  str: input,
  line,
  column
})

const output = (input, line, column) => [
  input,
  initInputObj('', line, column)
]

const basicTest = () => {
  for (const parser in base) {
    let valid = assertion.basic[parser]
    if (utils.notUndefined(valid)) {
      for (const input in valid) {
        const op = valid[input]
        const value = base[parser](initInputObj(input))
        const expected = output(op.str, op.line, op.column)
        test(parser, (t) => {
          t.deepEqual(value, expected)
        })
      }
    }
    valid = assertion.literal[parser]
    if (utils.notUndefined(valid)) {
      const inpTempl = valid[0]
      const checks = valid[1]
      for (const input in checks) {
        let value = base[parser](initInputObj(input))
        if (utils.notNull(value)) {
          value = value[0]
          delete value.cursorLoc
          delete value.isInLine
        }
        const output = checks[input]
        let expected = utils.isNull(output)
          ? null
          : templ[inpTempl](output)
        if (Array.isArray(output)) {
          expected = templ[inpTempl](...output)
        }
        test(parser, (t) => {
          t.deepEqual(value, expected)
        })
      }
    }
  }
}

basicTest()
