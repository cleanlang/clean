module.exports = (ast, indentObject) => {
  const exprList = ast.body
  for (let i = 0; i < indentObject.length - 1; i++) {
    if (indentObject[i].indent < indentObject[i + 1].indent) {
      exprList[i].declarations[0].init.body = blockStatementCreator(
        exprList[i].declarations[0].init.body, exprList[i + 1].expression)
      exprList.splice(i + 1, 1)
    }
  }
  ast.body = exprList
  return ast
}

const blockStatementCreator = (expr1, expr2) => {
  const blockStatement = {'type': 'BlockStatement', body: []}
  blockStatement.body.push(expr1)
  blockStatement.body.push(expr2)
  return blockStatement
}
// console.log(JSON.stringify(exprList[expr], null, 4))
