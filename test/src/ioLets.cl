include node-core


letsRock = do
  a <- getLine 'Enter a number: '
  let b = Math.pow (parseInt a) 5
  let c = b + 25 d = 'some string val'
  putLine a b c d
  let obj = {}
  let val1 = 'string'
  val2 <- getLine 'enter number'
  maybeTrue ((parseInt val2) % 2 != 0) (putLine 'not even')
  defineProp obj 'key' 123
  let returnVal = parseInt val2
  putLine obj
  delete obj.key
  putLine obj 'obj in this function'
  let vals = val2 + b + c
  return returnVal obj


main = do
    val obj <- letsRock
    putLine val obj
