include node-core

request = require 'request'

data = do
    err res body <- IO (request 'http://artii.herokuapp.com/make?text=data')
    return body

compute = do
   err res body val2 <- IO (request 'http://artii.herokuapp.com/make?text=compute1')
   a <- data
   putLine a
   maybeErr err (putLine err)
   maybeUndefined val2 (putLine 'encountered undefined')
   maybeNull err (putLine 'no error')


compute2 = do
   err res body <- IO (request 'http://artii.herokuapp.com/make?text=compute2')
   let a = res.body
   data
   putLine (a ++ 'deactivated')

