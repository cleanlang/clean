include node-core

computer a = do
      g <- getLine 'enter value:'
      return (a ++ g)

doBlock = do
     c <- computer 'abcd'
     putLine c
