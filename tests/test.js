const test = require('tape')
const parser = require(__dirname + '/../lib/parser')
const fs = require('fs')
let full_src = fs.readFileSync('test.cl', 'utf8').split('\n')
// Variable Declaration Parser
let src1 = full_src[0].toString()
let expc1 = {
    "type": "Program",
    "body": [
        {
            "type": "VariableDeclaration",
            "declarations": [
                {
                    "type": "VariableDeclarator",
                    "id": {
                        "type": "Identifier",
                        "name": "a"
                    },
                    "init": {
                        "type": "Literal",
                        "value": 7,
                        "raw": "7"
                    }
                }
            ],
            "kind": "const"
        }
    ],
    "sourceType": "script"
}

// Function Declaration Parser
let src2 = full_src[1].toString()
let expc2 = {
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
  t.plan(2)
  t.deepEqual(parser(src1), expc1, 'Varaible Declaration Parser')
  t.deepEqual(parser(src2), expc2, 'Function Declaration Parser')
})
