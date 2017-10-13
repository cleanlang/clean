class IOCore {
  constructor (ioFunc) {
    this.then = cb => ioFunc((...args) => cb(...args))
  }

  map (transform) {
    let saveThen = this.then
    this.then = cb => {
      saveThen((...args) => {
        let result = transform(...args)
        if (result !== undefined) {
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

  bind (ioFunc) {
    let saveThen = this.then
    this.then = cb => {
      saveThen((...args) => {
        if (args !== undefined) {
          let _args = ioFunc.length < args.length ? args.slice(0, ioFunc.length) : args
          let cbReturn = ioFunc(..._args)
          if (cbReturn !== undefined) {
            let cbReturnLen = cbReturn.length
            let io = cbReturn[cbReturnLen - 1]
            let argsForCb = cbReturn.slice(0, cbReturnLen - 1)
            io.then((...ioargs) => cb(...argsForCb, ...ioargs))
          }
        }
      })
    }
    return this
  }

  static timer (s) {
    var intervalId
    var timer = new IOCore(cb => {
      intervalId = setInterval(cb, Math.floor(s * 1000))
    })
    timer.clear = () => clearInterval(intervalId)
    return timer
  }

  static createIO (ioFunc) {
    return new IOCore(ioFunc)
  }
}
