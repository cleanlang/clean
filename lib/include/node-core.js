const readline = require("readline");

const rlConfig = {
  input: process.stdin,
  output: process.stdout,
}; /* Config for readline interface */

// eslint-disable-next-line no-unused-vars, no-undef
class IO extends IOCore {
  static getLine(str) {
    const rl = readline.createInterface(rlConfig);
    return new IO((cb) => rl.question(str, cb)).map((data) => {
      rl.close();
      return data;
    });
  }

  static putLine(...data) {
    return new IO((cb) => process.nextTick(cb, data)).map((data) => {
      console.log(...data);
      return data;
    });
  }
}
