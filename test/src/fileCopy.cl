include node-core

fs = require 'fs'

main = do
  err data <- IO (fs.readFile process.argv[2] 'utf8')
  maybeErr err (putLine err)
  err1 <- IO (fs.writeFile process.argv[3] data)
  maybeErr err1 (putLine err1)
