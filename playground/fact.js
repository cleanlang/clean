/* eslint-disable-next-line no-unused-vars */
class IOCore {
  constructor (ioFunc) {
    this.then = (cbFn) => ioFunc((...args) => cbFn(...args))
  }

  map (transform) {
    const saveThen = this.then
    this.then = (cbFn) => {
      saveThen((...args) => {
        const result = transform(...args)
        if (result !== undefined) {
          if (Array.isArray(result)) {
            cbFn(...result)
          } else {
            cbFn(result)
          }
        }
      })
    }
    return this
  }

  bind (ioFunc) {
    const saveThen = this.then
    this.then = (cbFn) => {
      saveThen((...args) => {
        if (args !== undefined) {
          const _args =
            ioFunc.length < args.length ? args.slice(0, ioFunc.length) : args
          const cbReturn = ioFunc(..._args)
          if (cbReturn !== undefined) {
            const cbReturnLen = cbReturn.length
            const io = cbReturn[cbReturnLen - 1]
            const argsForCb = cbReturn.slice(0, cbReturnLen - 1)
            io.then((...ioargs) => cbFn(...argsForCb, ...ioargs))
          }
        }
      })
    }
    return this
  }

  static timer (s) {
    let intervalId
    const timer = new IOCore((cbFn) => {
      intervalId = setInterval(cbFn, Math.floor(s * 1000))
    })
    timer.clear = () => clearInterval(intervalId)
    return timer
  }

  static createIO (ioFunc) {
    return new IOCore(ioFunc)
  }
}
const readline = require('readline')

const rlConfig = {
  input: process.stdin,
  output: process.stdout
} /* Config for readline interface */

/* eslint-disable-next-line no-unused-vars, no-undef */
class IO extends IOCore {
  static getLine (str) {
    const rl = readline.createInterface(rlConfig)
    return new IO((cb) => rl.question(str, cb)).map((data) => {
      rl.close()
      return data
    })
  }

  static putLine (...data) {
    return new IO((cb) => process.nextTick(cb, data)).map((data) => {
      console.log(...data)
      return data
    })
  }
}


global.IO = IO

const x = 1;  // in a line
const y = 1;
// in a new line
/* end of the program */
IO.putLine('testing inline comment inside "do"').then(() => [])  /* the end */
