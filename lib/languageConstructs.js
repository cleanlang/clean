/**
 * This file contains language keywords supported by clean
 */

const languageConstructs = {
  if: true,
  then: true,
  else: true,
  const: true,
  let: true,
  where: true,
  in: true,
  push: true,
  pop: true,
  shift: true,
  unshift: true,
  true: true,
  false: true,
  null: true,
  do: true,
  return: true,
  delete: true,
  defineProp: true
}

const reservedFunctionCalls = {
  print: true
}

module.exports = {
  languageConstructs,
  reservedFunctionCalls
}
