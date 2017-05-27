include node-core


data = do
    inp <- getLine ('enter a val: ')
    let val = parseInt inp
    maybeFalse (val % 2 == 0) (putLine 'not even')
    putLine 'even'
