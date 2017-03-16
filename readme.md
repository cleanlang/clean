# CleanJS

## A clean compile to JavaScript language

### Install

    $ npm install clean-js -g

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
    
    main = do
        req res <- createIO (app.get '/')
        res.send 'Hello World'
    
    app.listen 3000
