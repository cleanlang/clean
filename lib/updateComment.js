const updateComment = (body, commentArr = []) => {
  body = body.map((obj, index, array) => {
    if (obj.type === 'Line' || obj.type === 'Block') {
      commentArr.push(obj)
      if (array[index + 1] === undefined) {
        array[index - commentArr.length].trailingComments = commentArr
        return undefined
      }
      if (!(array[index + 1].type === 'Line' || array[index + 1].type === 'Block')) {
        array[index + 1].leadingComments = commentArr
        commentArr = []
      }
      return undefined
    }
    return obj
  }).filter(stmt => stmt !== undefined)
  return body
}

/*  Module Exports updateComment  */
module.exports = updateComment
