const jsFunctions = {
  'Number': {
    'type': 'function',
    'paramTypes': ['string'],
    'returnType': 'number'
  },
  'require': {
    'type': 'function',
    'paramTypes': ['string'],
    'returnType': 'needsInference'
  },
  'parseInt': {
    'type': 'function',
    'paramTypes': ['needsInference'],
    'returnType': 'number'
  },
  'parseFloat': {
    'type': 'function',
    'paramTypes': ['needsInference'],
    'returnType': 'number'
  },
  'String': {
    'type': 'function',
    'paramTypes': ['needsInference'],
    'returnType': 'string'
  }
}

/* Module exports jsFunctions */
module.exports = jsFunctions
