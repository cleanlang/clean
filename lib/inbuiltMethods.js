const setValues = (isMethod, isProp, isMutative, paramTypes, returnType) => ({
  isMethod,
  isProp,
  isMutative,
  paramTypes,
  returnType
})

const arrayType = ({
  'type': 'array',
  'elemTypes': {},
  'commonType': 'needsInference',
  'isHomogeneous': false
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
    'map': setValues(true, false, false, ['needsInference'], arrayType),
    'filter': setValues(true, false, false, ['needsInference'], arrayType),
    'reduce': setValues(true, false, false, ['needsInference'], 'needsInference'),
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
    'search': setValues(true, false, false, ['string', 'string'], 'string'),
    'repeat': setValues(true, false, false, ['number'], 'string')
  },
  'object': {
    'toString': setValues(true, false, false, null, 'string'),
    'hasOwnProperty': setValues(true, false, false, ['string'], 'bool')
  },
  'needsInference': {
    'length': {spec: setValues(false, true, false, null, 'number'), parentType: 'needsInference'},
    'push': {spec: setValues(true, false, true, null, null), parentType: arrayType},
    'pop': {spec: setValues(true, false, true, null, null), parentType: arrayType},
    'shift': {spec: setValues(true, false, true, null, null), parentType: arrayType},
    'unshift': {spec: setValues(true, false, true, null, null), parentType: arrayType},
    'splice': {spec: setValues(true, false, true, null, null), parentType: 'needsInference'},
    'slice': {spec: setValues(true, false, false, ['number', 'number'], 'needsInference'), parentType: 'needsInference'},
    'map': {spec: setValues(true, false, false, ['needsInference'], arrayType), parentType: arrayType},
    'filter': {spec: setValues(true, false, false, ['needsInference'], arrayType), parentType: arrayType},
    'reduce': {spec: setValues(true, false, false, ['needsInference'], 'needsInference'), parentType: arrayType},
    'includes': {spec: setValues(true, false, false, ['needsInference'], 'bool'), parentType: 'needsInference'},
    'join': {spec: setValues(true, false, false, ['string'], 'string'), parentType: arrayType},
    'toString': {spec: setValues(true, false, false, null, 'string'), parentType: 'needsInference'},
    'concat': {spec: setValues(true, false, false, ['array'], arrayType), parentType: arrayType},
    'charAt': {spec: setValues(true, false, false, ['number'], 'string'), parentType: 'string'},
    'charCodeAt': {spec: setValues(true, false, false, ['number'], 'number'), parentType: 'string'},
    'substring': {spec: setValues(true, false, false, ['number', 'number'], 'string'), parentType: 'string'},
    'substr': {spec: setValues(true, false, false, ['number', 'number'], 'string'), parentType: 'string'},
    'toUpperCase': {spec: setValues(true, false, false, null, 'string'), parentType: 'string'},
    'toLowerCase': {spec: setValues(true, false, false, null, 'string'), parentType: 'string'},
    'trim': {spec: setValues(true, false, false, null, 'string'), parentType: 'string'},
    'trimLeft': {spec: setValues(true, false, false, null, 'string'), parentType: 'string'},
    'trimRight': {spec: setValues(true, false, false, null, 'string'), parentType: 'string'},
    'startsWith': {spec: setValues(true, false, false, ['string'], 'bool'), parentType: 'string'},
    'split': {spec: setValues(true, false, false, ['string'], arrayType), parentType: 'string'},
    'replace': {spec: setValues(true, false, false, ['string', 'string'], 'string'), parentType: 'string'},
    'match': {spec: setValues(true, false, false, ['string'], 'number'), parentType: 'string'},
    'search': {spec: setValues(true, false, false, ['string', 'string'], 'string'), parentType: 'string'},
    'repeat': {spec: setValues(true, false, false, ['number'], 'string'), parentType: 'string'},
    'hasOwnProperty': {spec: setValues(true, false, false, ['string'], 'bool'), parentType: {type: 'object', propTypes: {}} }
  }
}

/* Module export inbuiltProps */
module.exports = inbuiltProps
