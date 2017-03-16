request = require 'request'

fact 1 = 1
fact n = n * fact (n - 1)

computeFact = do
     num <- getLine 'enter value for factorial: '
     let val = fact (parseInt num)
     putLine val
     return (String val)

getAscii = do
     data <- computeFact
     let link = 'http://artii.herokuapp.com/make?text=' ++ data
     err res body <- createIO (request link)
     mayBeErr err (putLine err)
     putLine body
     return body
     
tempIO = getAscii

main = tempIO
