const IO = require('io-square-node');
const fact = n => {
    switch (n) {
    case 1:
        return 1;
    default:
        return n * fact(n - 1);
    }
};
const computeFact = IO.getLine('enter value for factorial: ').map(num => [
    fact(parseInt(num)),
    num
]).bind((val, num) =>
    (IO.putLine(val))).map((val, num) => [val]);
const getAscii = computeFact.map(num => [
    String(num),
    num
]).bind((strNum, num) => IO.httpGet('http://artii.herokuapp.com/make?text=' + strNum)).map((strNum, num, ascii) => [
    ascii,
    strNum,
    num,
    ascii
]).bind((art, strNum, num, ascii) =>
    (IO.putLine(art))).map((art, strNum, num, ascii) => [[]]);
const tempIO = getAscii;
const main = tempIO.then(() => null);