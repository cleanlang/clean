const test = require('tape')
const parser = require(__dirname + '/../lib/parser')
let src = `add a b = 1`
let expc = {
    "type": "Program",
    "body": [
        {
            "type": "VariableDeclaration",
            "declarations": [
                {
                    "type": "VariableDeclarator",
                    "id": {
                        "type": "Identifier",
                        "name": "add"
                    },
                    "init": {
                        "type": "ArrowFunctionExpression",
                        "id": null,
                        "params": [
                            {
                                "type": "Identifier",
                                "name": "a"
                            },
                            {
                                "type": "Identifier",
                                "name": "b"
                            }
                        ],
                        "body": {
                            "type": "Literal",
                            "value": 1,
                            "raw": "1"
                        },
                        "generator": false,
                        "expression": true
                    }
                }
            ],
            "kind": "const"
        }
    ],
    "sourceType": "script"
}

test('parser', function (t) {
  t.plan(1)
  t.deepEqual(parser(src), expc)
})
