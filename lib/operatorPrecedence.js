const binaryOperators = {
  '.': {
    type: 'operator',
    prec: 9,
    assoc: 'R',
    def: 'FunctionComposition'
  },
  '^': {
    type: 'operator',
    prec: 8,
    assoc: 'R',
    def: 'Exponentiation'
  },
  '*': {
    type: 'operator',
    prec: 7,
    assoc: 'L',
    def: 'Multiplication'
  },
  '/': {
    type: 'operator',
    prec: 7,
    assoc: 'L',
    def: 'Division'
  },
  '+': {
    type: 'operator',
    prec: 6,
    assoc: 'L',
    def: 'Addition'
  },
  '-': {
    type: 'operator',
    prec: 6,
    assoc: 'L',
    def: 'Subtraction'
  },
  '==': {
    type: 'operator',
    prec: 4,
    assoc: 'L',
    def: 'Equal to'
  },
  '!==': {
    type: 'operator',
    prec: 4,
    assoc: 'L',
    def: 'Not Equal to'
  },
  '<': {
    type: 'operator',
    prec: 4,
    assoc: 'L',
    def: 'Less Than'
  },
  '<=': {
    type: 'operator',
    prec: 4,
    assoc: 'L',
    def: 'Less than or Equal to'
  },
  '>=': {
    type: 'operator',
    prec: 4,
    assoc: 'L',
    def: 'Greater than or Equal to'
  },
  '>': {
    type: 'operator',
    prec: 4,
    assoc: 'L',
    def: 'Greater than'
  },
  '&&': {
    type: 'operator',
    prec: 3,
    assoc: 'R',
    def: 'Logical AND'
  },
  '||': {
    type: 'operator',
    prec: 3,
    assoc: 'R',
    def: 'Logical OR'
  },
  '$': {
    type: 'delimiter',
    prec: -1
  }
}

module.exports = binaryOperators
