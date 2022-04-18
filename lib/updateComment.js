const isCommentBlock = (block) => {
  return block.type === 'Line' || block.type === 'Block'
}

const updateComment = (body, comments = []) => {
  return body
    .map((obj, index) => {
      if (isCommentBlock(obj)) {
        comments.push(obj)
        if (obj.isInLine && body[index - 1] !== undefined) {
          body[index - 1].trailingComments = comments
          comments = []
        } else if (body[index + 1] === undefined && index > 0) {
          body[index - comments.length].trailingComments = comments
        } else if (
          body[index + 1] !== undefined &&
          !isCommentBlock(body[index + 1])
        ) {
          body[index + 1].leadingComments = comments
          comments = []
        }
        delete obj.isInLine
        return undefined
      }
      return obj
    })
    .filter((stmt) => stmt !== undefined)
}

/*  Module Exports updateComment  */
module.exports = updateComment
