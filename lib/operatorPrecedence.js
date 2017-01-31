const binaryOperators = {
  '.': {
    type: 'function',
    prec: 9,
    assoc: 'R',
    def: 'FunctionComposition'
  },
  '^': {
    type: 'number',
    prec: 8,
    assoc: 'R',
    def: 'Exponentiation'
  },
  '*': {
    type: 'number',
    prec: 7,
    assoc: 'L',
    def: 'Multiplication'
  },
  '/': {
    type: 'number',
    prec: 7,
    assoc: 'L',
    def: 'Division'
  },
  '+': {
    type: 'number',
    prec: 6,
    assoc: 'L',
    def: 'Addition'
  },
  '-': {
    type: 'number',
    prec: 6,
    assoc: 'L',
    def: 'Subtraction'
  },
  '==': {
    type: 'bool',
    prec: 4,
    assoc: 'L',
    def: 'Equal to'
  },
  '!==': {
    type: 'bool',
    prec: 4,
    assoc: 'L',
    def: 'Not Equal to'
  },
  '<': {
    type: 'bool',
    prec: 4,
    assoc: 'L',
    def: 'Less Than'
  },
  '<=': {
    type: 'bool',
    prec: 4,
    assoc: 'L',
    def: 'Less than or Equal to'
  },
  '>=': {
    type: 'bool',
    prec: 4,
    assoc: 'L',
    def: 'Greater than or Equal to'
  },
  '>': {
    type: 'bool',
    prec: 4,
    assoc: 'L',
    def: 'Greater than'
  },
  '&&': {
    type: 'bool',
    prec: 3,
    assoc: 'R',
    def: 'Logical AND'
  },
  '||': {
    type: 'bool',
    prec: 3,
    assoc: 'R',
    def: 'Logical OR'
  },
  '++': {
    type: 'string',
    prec: 10,
    assoc: 'L',
    def: 'Concatenation'
  },
  '$': {
    type: 'delimiter',
    prec: -1
  }
}

module.exports = binaryOperators
