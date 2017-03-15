const ioFuncs = {
  'putLine': true,
  'getLine': true,
  'readFile': true,
  'writeFile': true,
  'httpGet': true,
  'create': true
}

const ioMeths = {
  'mayBeErr': true,
  'mayBeTrue': true,
  'mayBeFalse': true,
  'mayBeNull': true
}
/* Module exports the ioFuncNames object */
module.exports = {
  ioFuncs,
  ioMeths
}
