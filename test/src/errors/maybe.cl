include node-core



val = do
    a <- getLine 'enter string'
    maybeErr a ()
