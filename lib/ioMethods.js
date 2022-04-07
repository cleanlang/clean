const staticIOMethods = {
  putLine: true,
  getLine: true,
  get: true,
  del: true,
  getJSON: true,
  delJSON: true,
  getBlob: true,
  postJSON: true,
  putJSON: true,
  click: true,
  change: true,
  IO: true
}

const ioMethods = {
  maybeErr: true,
  maybeTrue: true,
  maybeFalse: true,
  maybeNull: true,
  maybeUndefined: true
}

const domMethods = {
  qs: 'querySelector',
  getElemId: 'getElementById',
  getElemTag: 'getElementByTagName'
}
/* Module exports the ioFuncNames object */
module.exports = {
  staticIOMethods,
  ioMethods,
  domMethods
}
