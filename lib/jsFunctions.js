/* This file contains JavaScript inbuilt functions, their accepted types and return types */
const jsFunctions = {
  Number: {
    type: "function",
    paramTypes: ["string"],
    returnType: "number",
  },
  require: {
    type: "function",
    paramTypes: ["string"],
    returnType: "needsInference",
  },
  parseInt: {
    type: "function",
    paramTypes: ["needsInference"],
    returnType: "number",
  },
  parseFloat: {
    type: "function",
    paramTypes: ["needsInference"],
    returnType: "number",
  },
  'String': {
    'type': 'function',
    'paramTypes': ['needsInference'],
    'returnType': 'string'
  },
  'Object': {
    'type': 'function',
    'paramTypes': ['needsInference'],
    'returnType': 'object'
  },
  'RegExp': {
    'type': 'function',
    'paramTypes': ['string'],
    'returnType': 'object'
  },
  'Date': {
    'type': 'function',
    'paramTypes': [],
    'returnType': 'string'
  },
  'isFinite': {
    'type': 'function',
    'paramTypes': ['number'],
    'returnType': 'boolean'
  },
  'isNaN': {
    'type': 'function',
    'paramTypes': ['number'],
    'returnType': 'boolean'
  }
}

/* Module exports jsFunctions */
module.exports = jsFunctions;
