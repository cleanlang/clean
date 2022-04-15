const es = require("escodegen");

const code = es.generate(
  {
    type: "Program",
    body: [
      {
        type: "VariableDeclaration",
        declarations: [
          {
            type: "VariableDeclarator",
            id: {
              type: "Identifier",
              name: "x",
            },
            init: {
              type: "Literal",
              value: 10,
              raw: "10",
            },
          },
        ],
        kind: "var",
        trailingComments: [
          {
            type: "Line",
            value: " ---xxx---",
            range: [12, 24],
          },
        ],
      },
      {
        type: "VariableDeclaration",
        declarations: [
          {
            type: "VariableDeclarator",
            id: {
              type: "Identifier",
              name: "y",
            },
            init: {
              type: "Literal",
              value: 20,
              raw: "20",
            },
          },
        ],
        kind: "var",
        leadingComments: [
          {
            type: "Line",
            value: " ---xxx---",
            range: [12, 24],
          },
        ],
        trailingComments: [
          {
            type: "Line",
            value: " ----yy-----",
            range: [37, 51],
          },
        ],
      },
    ],
    sourceType: "script",
  },
  {
    comment: true,
  }
);

console.log(code);
