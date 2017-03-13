const IO = require('io-square-node')
const fact = n => {
    switch (n) {
    case 1:
        return 1
    default:
        return n * fact(n - 1)
    }
}
const computeFact = () => {
    return IO.getLine('enter value for factorial: ').map(num => {
        return [
            fact(parseInt(num)),
            num
        ]
    }).bind((val, num) => {
        return IO.putLine(val)
    }).map((val, num) => {
        return [
            val,
            num
        ]
    }).map((val, num) => {
        return [val]
    })
}
const getAscii = () => {
    return computeFact().map(num => {
        return [
            String(num),
            num
        ]
    }).bind((strNum, num) => IO.httpGet('http://artii.herokuapp.com/make?text=' + strNum)).map((strNum, num, ascii) => {
        return [
            ascii,
            strNum,
            num,
            ascii
        ]
    }).bind((art, strNum, num, ascii) => {
        return IO.putLine(art)
    }).map((art, strNum, num, ascii) => {
        return [
            art,
            strNum,
            num,
            ascii
        ]
    }).map((art, strNum, num, ascii) => {
        return [null]
    })
}
const tempIO = getAscii
{
    ((() => {
        (tempIO().then(data => {
            return [data]
        }))
    })())
}