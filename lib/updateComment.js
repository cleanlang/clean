const isCommentBlock = (block) =>
  block.type === 'Line' || block.type === 'Block'

const updateComment = (body, comments = []) => {
  return body
    .map((obj, index) => {
      if (isCommentBlock(obj)) {
        comments.push(obj)
        if (body[index + 1] === undefined) {
          body[index - comments.length].trailingComments = comments
        } else if (!isCommentBlock(body[index + 1])) {
          body[index + 1].leadingComments = comments
          comments = []
        }
        return undefined
      }
      return obj
    })
    .filter((stmt) => stmt !== undefined)
}

/*  Module Exports updateComment  */
module.exports = updateComment
