const atNewExpression = /\n(?!\s)/
const splitter = source => source.split(atNewExpression)
module.exports = splitter
