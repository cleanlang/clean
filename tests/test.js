const IO = require('<path_to_clean>/lib/import/node-core');
const request = require('request');
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
    (IO.putLine(val))).map((val, num) => [String(val)]);
const getAscii = computeFact.map(data => [
    'http://artii.herokuapp.com/make?text=' + data,
    data
]).bind((link, data) => IO.createIO(cb => request(link, cb))).mayBeErr((link, data, err, res, body) => err, (link, data, err, res, body) => IO.putLine(err).then(() => null)).bind((link, data, err, res, body) =>
    (IO.putLine(body))).map((link, data, err, res, body) => [body]);
const tempIO = getAscii;
const main = tempIO.then(() => null);