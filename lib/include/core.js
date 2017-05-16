const notAllDefined = args => args === undefined || args.filter(arg => arg === undefined).length > 0;

class IOCore {
  constructor (ioFunc) {
    this.then = cb => ioFunc((...args) => {
      if (notAllDefined(args)) return;
      cb(...args)
    });
  };

  reject (pred) {
    let saveThen = this.then;
    this.then = cb => {
      saveThen((...args) => {
        let result = pred(...args);
        if (result !== null) {
          if (Array.isArray(result)) {
            cb(...result);
          } else {
            cb(result);
          }
        };
      });
    };
    return this;
  };

  maybeFalse (mv, handler) {
    let saveThen = this.then;
    this.then = cb => {
      saveThen((...args) => {
        let result = mv(...args);
        if (result === false) {
          handler(...args);
        } else {
          cb(...args);
        }
      });
    };
    return this;
  };

  maybeNull (mv, handler) {
    let saveThen = this.then;
    this.then = cb => {
      saveThen((...args) => {
        let result = mv(...args);
        if (result === null) {
          handler(...args);
        } else {
          cb(...args);
        }
      });
    };
    return this;
  };

  maybeErr (mv, handler) {
    let saveThen = this.then;
    this.then = cb => {
      saveThen((...args) => {
        let result = mv(...args);
        if (result instanceof Error) {
          handler(...args);
        } else {
          cb(...args);
        }
      });
    };
    return this;
  };

  maybeTrue (mv, handler) {
    let saveThen = this.then;
    this.then = cb => {
      saveThen((...args) => {
        let result = mv(...args);
        if (result === true) {
          handler(...args);
        } else {
          cb(...args);
        }
      });
    };
    return this;
  };

  maybeUndefined (mv, handler) {
    let saveThen = this.then;
    this.then = cb => {
      saveThen((...args) => {
        let result = mv(...args);
        if (result === undefined) {
          handler(...args);
        } else {
          cb(...args);
        }
      });
    };
    return this;
  };

  map (transform) {
    let saveThen = this.then;
    this.then = cb => {
      saveThen((...args) => {
        if (notAllDefined(args)) return;
        let result = transform(...args);
        if (Array.isArray(result)) {
          cb(...result);
        } else {
          cb(result);
        }
      });
    };
    return this;
  };

  bind (ioFunc) {
    let saveThen = this.then;
    this.then = cb => {
      saveThen((...args) => {
        args = ioFunc.length < args.length ? args.slice(0, ioFunc.length) : args
        let io = ioFunc(...args);
        io.then((...ioargs) => cb(...args, ...ioargs));
      });
    };
    return this;
  };

  static timer (s) {
    var intervalId;
    var timer = new IOCore(cb => {
      intervalId = setInterval(cb, Math.floor(s * 1000))
    });
    timer.clear = () => clearInterval(intervalId);
    return timer;
  };

  static createIO (ioFunc) {
    return new IOCore(ioFunc);
  };
};
