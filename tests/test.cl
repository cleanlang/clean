IO = require 'io-square-node'

fact 1 = 1
fact n = n * fact (n - 1)

computeFact = do
     num <- getLine 'enter value for factorial: '
     let val = fact (parseInt num)
     putLine val
     return val

getAscii = do
     num <- computeFact
     let strNum = String num
     ascii <- httpGet 'http://artii.herokuapp.com/make?text=' ++ strNum
     let art = ascii
     putLine art


tempIO = getAscii

main = tempIO
