
const readline = require('readline')
const fs = require('fs')

const rlConfig = {
  input: process.stdin,
  output: process.stdout
} /* Config for readline interface */

/* IO class starts here */
class IO {

  constructor (ioFunc) {
    this.then = cb => ioFunc((...args) => { cb(...args) })
  }

  reject (pred) {
    let saveThen = this.then
    this.then = cb => {
      saveThen((...args) => {
        let result = pred(...args)
        if (result !== null) {
          if (Array.isArray(result)) {
            cb(...result)
          } else {
            cb(result)
          }
        }
      })
    }
    return this
  }

  mayBeFalse (mv, handler) {
    let saveThen = this.then
    this.then = cb => {
      saveThen((...args) => {
        let result = mv(...args)
        if (result === false) {
          handler(...args)
        } else {
          cb(...args)
        }
      })
    }
    return this
  }

  mayBeNull (mv, handler) {
    let saveThen = this.then
    this.then = cb => {
      saveThen((...args) => {
        let result = mv(...args)
        if (result === null) {
          handler(...args)
        } else {
          cb(...args)
        }
      })
    }
    return this
  }

  mayBeErr (mv, handler) {
    let saveThen = this.then
    this.then = cb => {
      saveThen((...args) => {
        let result = mv(...args)
        if (result instanceof Error) {
          handler(...args)
        } else {
          cb(...args)
        }
      })
    }
    return this
  }

  mayBeTrue (mv, handler) {
    let saveThen = this.then
    this.then = cb => {
      saveThen((...args) => {
        let result = mv(...args)
        if (result === true) {
          handler(...args)
        } else {
          cb(...args)
        }
      })
    }
    return this
  }

  map (transform) {
    let saveThen = this.then
    this.then = cb => {
      saveThen((...args) => {
        let result = transform(...args)
        if (Array.isArray(result)) {
          cb(...result)
        } else {
          cb(result)
        }
      })
    }
    return this
  }

  bind (ioFunc) {
    let saveThen = this.then
    this.then = cb => {
      saveThen((...args) => {
        let io = ioFunc(...args)
        io.then((...ioargs) => cb(...args, ...ioargs))
      })
    }
    return this
  }

  static timer (s) {
    var intervalId
    var timer = new IO(cb => {
      intervalId = setInterval(cb, Math.floor(s * 1000))
    })
    timer.clear = () => clearInterval(intervalId)
    return timer
  }

  static createIO (ioFunc) {
    return new IO(ioFunc)
  }

  static getLine (str) {
    const rl = readline.createInterface(rlConfig)
    return new IO(cb => rl.question(str, cb))
      .map(data => {
        rl.close()
        return data
      })
  }

  static putLine (...data) {
    return new IO(cb => process.nextTick(cb, data))
      .map(data => {
        console.log(...data)
        return data
      })
  }

  static readFile (filename) {
    return new IO(cb => fs.readFile(filename, cb))
      .map((_, data) => data.toString())
  }

  static writeFile (filename, data) {
    return new IO(cb => fs.writeFile(filename, data, cb))
  }
}
