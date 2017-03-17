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

    main = putLine 'Hello World!'

Define function `main`. It is called at the start of your program. `putLine` is an asynchronous
function.

### File copy program

    main = do
      data <- readFile process.argv[2]
      writeFile process.argv[3] data

Copies file given as the first argument to the file with name given as the next argument. Example

    $ clean copy.cl file1.txt file2.txt

Both `readFile` and `writeFile` are asynchronous function. These are Evented IO functions. In `clean`
you can do evented io in `main` or `do` blocks only.

### Factorial function

    factorial 1 = 1
    factorial n = n * factorial (n - 1)

    main = putLine (factorial 5)

You can use pattern matching `(factorial 1 = 1)` in function definitions in `clean`.

### Express example

    express = require 'express'
    app = express ()

    do
      req res <- createIO (app.get '/')
      res.send 'Hello World'

    app.listen 3000

Use `createIO` to create your own Evented IO function. The argument to `createIO` is the IO
call you want to make minus the callback. (Notice that we don't provide a callback to `app.get`).

There is no `main` in our program above. `main` is not mandatory. Since most of the IO you do is evented,
the events will get activated in the `do`

### Combining IO blocks example

Here is a command line program that gets a user input number. The factorial of the
number is calculated, and ascii art from an API, for the factorial is printed.

    request = require 'request'

    fact 1 = 1
    fact n = n * fact (n - 1)

    computeFact = do
      num <- getLine 'enter value for factorial: '
      let val = fact (parseInt num)
      putLine val
      return (String val)

    do
      data <- computeFact
      let link = 'http://artii.herokuapp.com/make?text=' ++ data
      err res body <- createIO (request link)
      mayBeErr err (putLine err)
      putLine body

We define `computeFact` to be an IO function that takes the user input and returns the
computed factorial as a string. Note the return statement. This is not the regular return
statement in JavaScript or similar languages. This return `lifts` the string into an IO type.
All do blocks evaluate to Evented IO Types internally. We need the `return` for this do block
because `computeFact` will be used in the next `do` block.

In the next `do` block we bind `computeFact` to a variable called `data`. You can use let
statements in a `do` block to create scoped variables. `++` is used for string concatenation.
The we create an evented IO that uses `request`. The created IO function is bound to `err`,
`res` and `body`. `mayBeErr` will terminate the do if `err` is an instance of JavaScript Error, and calls
`putLine err`.
