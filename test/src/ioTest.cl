include node-core


compute = do
    a <- getLine 'enter some value'
    return a

sum = do
   c <- readFile 'basicAssertion.json'
   return c

e = do
   compute

d = do
  compute
  c <- sum
  compute
