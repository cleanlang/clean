const indentStacker = (ast, indentObject) => {
  const exprList = ast.body
  ast.body = blockChecker(exprList, indentObject)
  // console.log(JSON.stringify(ast, null, 4))
  return ast
}

const blockChecker = (exprList, indentObject, index = 0) => {
  if (indentObject[index].indent < indentObject[index + 1].indent) {
    var [exprList, indentObject, index] = blockStatementCreator(exprList, indentObject, index)
  }
  return index < indentObject.length - 2 ? blockChecker(exprList, indentObject, ++index)
                                         : exprList
}

const blockStatementCreator = (exprList, indentObject, index) => {
  const parent = index
  const blockStatement = {'type': 'BlockStatement', body: []}
  var [block, index] = expressionStacker(exprList, indentObject, ++index)
  blockStatement.body.push(exprList[parent].declarations[0].init.body)
  blockStatement.body.push(...block)
  exprList[parent].declarations[0].init.body = blockStatement
  return [exprList, indentObject, index]
}

const expressionStacker = (exprList, indentObject, index) => {
  const block = [exprList[index]]
  exprList.splice(index, 1)
  while (indentObject[index].indent === indentObject[index + 1].indent) {
    block.push(exprList[index])
    exprList.splice(index, 1)
    if (index === indentObject.length - 1) break
    index++
  }
  return [block, ++index]
}

module.exports = indentStacker
