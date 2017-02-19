const setValues = (isMethod, isProp, isMutative, paramTypes, returnType) => ({
  isMethod,
  isProp,
  isMutative,
  paramTypes,
  returnType
})

const arrayType = ({
  'type': 'array',
  'elemTypes': null,
  'commonType': null,
  'isHomogeneous': null
})

const inbuiltProps = {
  'array': {
    'length': setValues(false, true, false, null, 'number'),
    'push': setValues(true, false, true, null, null),
    'pop': setValues(true, false, true, null, null),
    'shift': setValues(true, false, true, null, null),
    'unshift': setValues(true, false, true, null, null),
    'splice': setValues(true, false, true, null, null),
    'slice': setValues(true, false, false, ['number', 'number'], arrayType),
    'map': setValues(true, false, false, ['function'], arrayType),
    'filter': setValues(true, false, false, ['function'], arrayType),
    'reduce': setValues(true, false, false, ['function'], 'needsInference'),
    'includes': setValues(true, false, false, ['needsInference'], 'bool'),
    'join': setValues(true, false, false, ['string'], 'string'),
    'toString': setValues(true, false, false, null, 'string'),
    'concat': setValues(true, false, false, ['array'], arrayType)
  },
  'string': {
    'length': setValues(false, true, false, null, 'number'),
    'splice': setValues(true, false, true, null, null),
    'charAt': setValues(true, false, false, ['number'], 'string'),
    'charCodeAt': setValues(true, false, false, ['number'], 'number'),
    'substring': setValues(true, false, false, ['number', 'number'], 'string'),
    'substr': setValues(true, false, false, ['number', 'number'], 'string'),
    'includes': setValues(true, false, false, ['string'], 'bool'),
    'toUpperCase': setValues(true, false, false, null, 'string'),
    'toLowerCase': setValues(true, false, false, null, 'string'),
    'slice': setValues(true, false, false, ['number', 'number'], 'string'),
    'trim': setValues(true, false, false, null, 'string'),
    'trimLeft': setValues(true, false, false, null, 'string'),
    'trimRight': setValues(true, false, false, null, 'string'),
    'startsWith': setValues(true, false, false, ['string'], 'bool'),
    'split': setValues(true, false, false, ['string'], arrayType),
    'replace': setValues(true, false, false, ['string', 'string'], 'string'),
    'match': setValues(true, false, false, ['string'], 'number'),
    'search': setValues(true, false, false, ['string', 'string'], 'string')
  },
  'object': {
    'toString': setValues(true, false, false, null, 'string'),
    'hasOwnProperty': setValues(true, false, false, ['string'], 'bool')
  }
}

/* Module export inbuiltProps */
module.exports = inbuiltProps
