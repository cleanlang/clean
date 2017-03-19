class IOCore {
  constructor (ioFunc) {
    this.then = cb => ioFunc((...args) => { cb(...args) });
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

  mayBeFalse (mv, handler) {
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

  mayBeNull (mv, handler) {
    let saveThen = this.then;
    this.then = cb => {
      saveThen((...args) => {
        let result = mv(...args)
        if (result === null) {
          handler(...args);
        } else {
          cb(...args);
        }
      });
    };
    return this;
  };

  mayBeErr (mv, handler) {
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

  mayBeTrue (mv, handler) {
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

  mayBeUndefined (mv, handler) {
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
