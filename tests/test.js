const test = require('tape')
const parser = require(__dirname + '/../lib/parser')
let src = `a = 7`
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

test('parser', function (t) {
  t.plan(1)
  t.deepEqual(parser(src), expc)
})
