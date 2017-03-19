const readline = require('readline');
const fs = require('fs');

const rlConfig = {
  input: process.stdin,
  output: process.stdout
}; /* Config for readline interface */

class IO extends IOCore {
  static getLine (str) {
    const rl = readline.createInterface(rlConfig);
    return new IOCore(cb => rl.question(str, cb))
      .map(data => {
        rl.close();
        return data;
      });
  };

  static putLine (...data) {
    return new IOCore(cb => process.nextTick(cb, data))
      .map(data => {
        console.log(...data);
        return data
      });
  };

  static readFile (filename) {
    return new IOCore(cb => fs.readFile(filename, cb))
      .map((_, data) => data.toString());
  };

  static writeFile (filename, data) {
    return new IOCore(cb => fs.writeFile(filename, data, cb));
  };
};
