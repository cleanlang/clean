# CleanJS

## A clean compile to JavaScript language

### Install

    $ npm install cleanlang -g

### Usage

    $ clean hello.cl

Will compile and run `hello.cl`

    $ clean --help

For more options

### Hello World

    main = putLine 'Hello World'

### File copy program

    main = do
      data <- readFile process.argv[2]
      writeFile process.argv[3] data

### Factorial function

    factorial 1 = 1
    factorial n = n * factorial (n - 1)

    main = putLine (factorial 5)

### Express Example

    express     = require 'express'
    app         = express ()

    do
        req res <- createIO (app.get '/')
        res.send 'Hello World'

    app.listen 3000

### Program Example

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
