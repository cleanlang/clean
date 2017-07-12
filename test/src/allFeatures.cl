include node-core

request = require 'request'

a = 1

b = 'a'

c = true

d = false

e = null

f = b ++ 'b'

g = 4 * 3 / 7 ^ 9 - 15 + 75 * 9

sum a b = a + b

product = \a b -> a * b

h = sum 4 5 ^ 1 + 16 * 7 / (4 + a) - (product 2 (sum 1 2))

sqr = (\a -> a * a) 4

print h sqr

letin = let x = 15 in x ^ 4 * 5

caller = do
     a <- getLine 'random string'
     err res <- IO (request 'http://google.com')
     maybeErr err (putLine err)
     let ob = {f: 25}
     defineProp ob 'b' 45
     delete ob.b
     putLine res.body
     return res.body

do
  body <- caller
  putLine body


main = do
    putLine 'Hello world'
