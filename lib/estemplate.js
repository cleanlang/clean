const types = require("./operatorPrecedence");
const notNull = require("./utilityFunctions").notNull;
const notUndefined = require("./utilityFunctions").notUndefined;
let estemplate = {};

const extractExpr = (token) =>
  notUndefined(token) && notNull(token) && token.type === "ExpressionStatement"
    ? token.expression
    : token;

estemplate.ast = () => ({ type: "Program", body: [], sourceType: "script" });

estemplate.literal = (value) => ({
  type: "Literal",
  value: Number(value),
  raw: value,
  sType: "number",
});

estemplate.nullLiteral = (value) => ({
  type: "Literal",
  value: null,
  raw: value,
  sType: "needsInference",
});

estemplate.boolLiteral = (value) => ({
  type: "Literal",
  value: !(value === "false"),
  raw: value,
  sType: "bool",
});

estemplate.stringLiteral = (value) => ({
  type: "Literal",
  value: value,
  raw: value,
  sType: "string",
});

estemplate.identifier = (value) => ({ type: "Identifier", name: value });

estemplate.regex = (regex, pattern, flags) => ({
  type: "Literal",
  value: new RegExp(pattern, flags),
  raw: regex,
  regex: {
    pattern: pattern,
    flags: flags,
  },
  sType: "regexp",
});

estemplate.declaration = (id, val) => ({
  type: "VariableDeclaration",
  declarations: [
    {
      type: "VariableDeclarator",
      id,
      init: extractExpr(val),
    },
  ],
  kind: "const",
});

estemplate.letDecl = (id, val) => ({
  type: "VariableDeclaration",
  declarations: [
    {
      type: "VariableDeclarator",
      id,
      init: extractExpr(val),
    },
  ],
  kind: "let",
});

estemplate.funcDeclaration = (id, params, body) => ({
  type: "VariableDeclaration",
  declarations: [
    {
      type: "VariableDeclarator",
      id,
      init: {
        type: "ArrowFunctionExpression",
        id: null,
        params: params,
        body: extractExpr(body) || "",
        generator: false,
        expression: body === undefined || body.type !== "BlockStatement",
      },
    },
  ],
  kind: "const",
});

estemplate.lambdaCall = (params, args, body) => ({
  type: "CallExpression",
  callee: {
    type: "ArrowFunctionExpression",
    id: null,
    params: params,
    body: extractExpr(body) || "",
    generator: false,
    expression: body === undefined || body.type !== "BlockStatement",
  },
  arguments: args.map(extractExpr),
});

estemplate.letExpression = (params, args, body) => ({
  type: "CallExpression",
  callee: {
    type: "ArrowFunctionExpression",
    id: null,
    params: params,
    body: extractExpr(body) || "",
    generator: false,
    expression: true,
  },
  arguments: args.map(extractExpr),
});

estemplate.memberExpression = (obj, prop) => ({
  type: "ExpressionStatement",
  expression: {
    type: "MemberExpression",
    computed: false,
    object: extractExpr(obj),
    property: extractExpr(prop),
  },
});

estemplate.subscriptExpression = (obj, prop) => ({
  type: "ExpressionStatement",
  expression: {
    type: "MemberExpression",
    computed: true,
    object: extractExpr(obj),
    property: extractExpr(prop),
  },
});

estemplate.printexpression = (args) => ({
  type: "CallExpression",
  callee: {
    type: "MemberExpression",
    computed: false,
    object: {
      type: "Identifier",
      name: "console",
    },
    property: {
      type: "Identifier",
      name: "log",
    },
  },
  arguments: args.map((arg) => extractExpr(arg)),
  sType: "IO",
});

estemplate.fnCall = (val, args) =>
  val.name === "print"
    ? estemplate.printexpression(args)
    : {
        type: "CallExpression",
        callee: extractExpr(val),
        arguments: args.map(extractExpr),
      };

estemplate.lambda = (params, body) => ({
  type: "ExpressionStatement",
  expression: {
    type: "ArrowFunctionExpression",
    id: null,
    params,
    body: extractExpr(body) || "",
    generator: false,
    expression: body === undefined || body.type !== "BlockStatement",
  },
});

estemplate.binaryExpression = (left, op, right) => {
  let opType = op === "instanceof" ? "any" : types[op].type;
  if (op === "^") return binaryExpr(left, "**", right, opType);
  if (op === "++") return binaryExpr(left, "+", right, opType);
  if (op === "==") return binaryExpr(left, "===", right, opType);
  if (op === "!=") return binaryExpr(left, "!==", right, opType);
  return binaryExpr(left, op, right, opType);
};

const binaryExpr = (left, op, right, opType) => ({
  type: "BinaryExpression",
  operator: op,
  sType: opType,
  left: extractExpr(left),
  right: extractExpr(right),
});

estemplate.unaryExpression = (op, arg) => ({
  type: "UnaryExpression",
  operator: op,
  argument: extractExpr(arg),
  prefix: true,
});

estemplate.blockStmt = (body) => ({
  type: "BlockStatement",
  body: body,
});

estemplate.ifthenelse = (condition, result1, result2) => ({
  type: "ExpressionStatement",
  expression: {
    type: "ConditionalExpression",
    test: extractExpr(condition),
    consequent: extractExpr(result1),
    alternate: extractExpr(result2),
  },
});

estemplate.ifStmt = (predicate, consequent) => ({
  type: "IfStatement",
  test: predicate,
  consequent: {
    type: "BlockStatement",
    body: [consequent, estemplate.returnStmt(null)],
  },
  alternate: null,
});

estemplate.array = (elements) => ({
  type: "ArrayExpression",
  elements: elements.map(extractExpr),
});

estemplate.object = (value) => ({
  type: "ObjectExpression",
  properties: extractExpr(value),
});

estemplate.objectProperty = (key, val) => ({
  type: "Property",
  key: key,
  computed: false,
  value: extractExpr(val),
  kind: "init",
  method: false,
  shorthand: false,
});

estemplate.comment = (type, val) => ({
  type: type,
  value: val,
});

estemplate.ioCall = (ioFunc, args, nextParams = []) => ({
  type: "CallExpression",
  callee: {
    type: "MemberExpression",
    computed: false,
    object: {
      type: "Identifier",
      name: "IO",
    },
    property: ioFunc,
  },
  arguments: args.map(extractExpr),
  nextParams,
});

estemplate.ioBind = (parentIO, ioCall, nextParams = []) => ({
  type: "CallExpression",
  callee: {
    type: "MemberExpression",
    computed: false,
    object: parentIO,
    property: {
      type: "Identifier",
      name: "bind",
    },
  },
  arguments: [ioCall].map(extractExpr),
  nextParams,
});

estemplate.ioMap = (parentIO, pureFunc, nextParams = []) => ({
  type: "CallExpression",
  callee: {
    type: "MemberExpression",
    computed: false,
    object: parentIO,
    property: {
      type: "Identifier",
      name: "map",
    },
  },
  arguments: [pureFunc].map(extractExpr),
  nextParams,
});

estemplate.ioThen = (parentIO, func, ioParams) => ({
  type: "CallExpression",
  callee: {
    type: "MemberExpression",
    computed: false,
    object: parentIO,
    property: {
      type: "Identifier",
      name: "then",
    },
  },
  arguments: [func].map(extractExpr),
  ioParams,
});

estemplate.ioFunc = (id, args) => ({
  type: "CallExpression",
  callee: {
    type: "MemberExpression",
    computed: false,
    object: {
      type: "Identifier",
      name: "IO",
    },
    property: id,
  },
  arguments: args.map(extractExpr),
});

estemplate.defineProp = (objID, key, val, mutable) => ({
  type: "ExpressionStatement",
  expression: {
    type: "CallExpression",
    callee: {
      type: "MemberExpression",
      computed: false,
      object: {
        type: "Identifier",
        name: "Object",
      },
      property: {
        type: "Identifier",
        name: "defineProperty",
      },
    },
    arguments: [
      objID,
      key,
      {
        type: "ObjectExpression",
        properties: [
          {
            type: "Property",
            key: {
              type: "Identifier",
              name: "value",
            },
            computed: false,
            value: val,
            kind: "init",
            method: false,
            shorthand: false,
          },
          {
            type: "Property",
            key: {
              type: "Identifier",
              name: "enumerable",
            },
            computed: false,
            value: {
              type: "Literal",
              value: true,
              raw: "true",
            },
            kind: "init",
            method: false,
            shorthand: false,
          },
          {
            type: "Property",
            key: {
              type: "Identifier",
              name: "writable",
            },
            computed: false,
            value: {
              type: "Literal",
              value: mutable,
              raw: mutable.toString(),
            },
            kind: "init",
            method: false,
            shorthand: false,
          },
          {
            type: "Property",
            key: {
              type: "Identifier",
              name: "configurable",
            },
            computed: false,
            value: {
              type: "Literal",
              value: mutable,
              raw: mutable.toString(),
            },
            kind: "init",
            method: false,
            shorthand: false,
          },
        ],
      },
    ],
  },
});

estemplate.returnStmt = (args) => ({
  type: "ReturnStatement",
  argument: args,
});

estemplate.defaultIOThen = (parentObj) => ({
  type: "CallExpression",
  callee: {
    type: "MemberExpression",
    computed: false,
    object: parentObj,
    property: {
      type: "Identifier",
      name: "then",
    },
  },
  arguments: [
    {
      type: "ArrowFunctionExpression",
      id: null,
      params: [],
      body: {
        type: "Literal",
        value: null,
        raw: "null",
      },
      generator: false,
      expression: true,
    },
  ],
});

estemplate.expression = (expr) => ({
  type: "ExpressionStatement",
  expression: expr,
});

/*  Module Exports estemplate  */
module.exports = estemplate;
