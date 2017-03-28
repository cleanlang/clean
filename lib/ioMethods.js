const ioFuncs = {
  'putLine': true,
  'getLine': true,
  'readFile': true,
  'writeFile': true,
  'get': true,
  'del': true,
  'getJSON': true,
  'delJSON': true,
  'getBlob': true,
  'postJSON': true,
  'putJSON': true,
  'click': true,
  'change': true,
  'IO': true
}

const ioMeths = {
  'maybeErr': true,
  'maybeTrue': true,
  'maybeFalse': true,
  'maybeNull': true,
  'maybeUndefined': true
}
/* Module exports the ioFuncNames object */
module.exports = {
  ioFuncs,
  ioMeths
}
