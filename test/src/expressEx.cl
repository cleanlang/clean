include node-core
express = require 'express'
app = express ()

do
  req res <- IO (app.get '/')
  res.send 'Hello World'

app.listen 3000
