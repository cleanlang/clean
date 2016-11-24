let estemplate = {}
let ast = {type: 'Program', body: [], sourceType: 'script'}

estemplate.ast = () => ast

estemplate.literal = (value, raw) => {
  if (raw === undefined) {
    return {type: 'Literal', value: value}
  }
  return {type: 'Literal', value: value, raw: raw}
}

estemplate.stringliteral = value => {
  return {type: 'StringLiteral', value: '"' + value + '"'}
}

estemplate.identifier = value => {
  return {type: 'Identifier', name: value}
}

estemplate.funcdeclaration = (val, params) => {
  return {
    type: 'VariableDeclaration',
    declarations: [
      {
        type: 'VariableDeclarator',
        id: val,
        init: {
          type: 'ArrowFunctionExpression',
          id: null,
          params: params,
          body: {},
          generator: false,
          expression: true
        }
      }
    ],
    kind: 'const'}
}

estemplate.fnCall = (val, args) => {
  return {
    type: 'ExpressionStatement',
    expression: {
      type: 'CallExpression',
      callee: val,
      arguements: args
    }
  }
}

estemplate.lambda = (params) => {
  return {
    type: 'ExpressionStatement',
    expression: {
      type: 'ArrowFunctionExpression',
      id: null,
      params: params,
      body: {},
      generator: false,
      expression: true
    }
  }
}

estemplate.declaration = (id, val) => {
  return {
    type: 'VariableDeclaration',
    declarations: [
      {
        type: 'VariableDeclarator',
        id: id,
        init: val
      }
    ],
    kind: 'const'
  }
}

/*  Module Exports estemplate  */
module.exports = estemplate
