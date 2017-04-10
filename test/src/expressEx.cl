include node-core
express = require 'express'
app = express ()

sum a b = a + b

do
  req res <- IO (app.get '/')
  let val = sum 5 15
  maybeTrue (val > 4 * 15) (res.send 'welcome')
  res.send 'Hello World'

app.listen 3000
