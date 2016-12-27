const indentStacker = (ast, indentObject) => {
  const exprList = ast.body
  ast.body = blockChecker(exprList, indentObject)
  return ast
}

const blockChecker = (exprList, indentObject, index = 0) => {
  let [nextExprList, nextIndentObject, nextIndex] = [exprList, indentObject, index]
  if (index < indentObject.length - 2)
    if (indentObject[index].indent < indentObject[index + 1].indent) {
      [nextExprList, nextIndentObject, nextIndex] = blockStatementCreator(exprList, indentObject, index)
    }
  return index < indentObject.length - 2 ? blockChecker(nextExprList, nextIndentObject, ++nextIndex)
                                         : nextExprList
}

const blockStatementCreator = (exprList, indentObject, index) => {
  const parent = index
  const blockStatement = {'type': 'BlockStatement', body: []}
  let [newExprList, block, nextIndex] = expressionStacker(exprList, indentObject, ++index)
  blockStatement.body.push(newExprList[parent].declarations[0].init.body)
  blockStatement.body.push(...block)
  newExprList[parent].declarations[0].init.body = blockStatement
  return [newExprList, indentObject, nextIndex]
}

const expressionStacker = (exprList, indentObject, index) => {
  let [newExprList, newIndentObject, newIndex] = [exprList, indentObject, index]
  const block = [newExprList[newIndex]]
  newExprList.splice(newIndex, 1)
  while (newIndentObject[newIndex].indent === newIndentObject[newIndex + 1].indent) {
    block.push(newExprList[newIndex])
    newExprList.splice(newIndex, 1)
    if (newIndex === newIndentObject.length - 1) break
    newIndex++
  }
  return [newExprList, block, ++newIndex]
}

module.exports = indentStacker

// console.log(JSON.stringify(, null, 4))
