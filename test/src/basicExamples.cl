intDec = 1233567
floatDec = -123.45678
negIntDec = -1234567
negFloatDec = -1.346788
num = 144

expDec = 1e+10
expDec2 = 1e-6

exponentDec = 5 ^ 2
powDec = 5 ^ 2 ^ 3 ^ 1 ^ 1 ^ 1
powDec2 = 222 ^ -1

multpDec = 22 * 2 * 3 * 1 * 1111

modDec = 22 % 1
modDec2 = 44 % 3 % 2

divDec = 1 / 2
divDec2 = (1 / 1) / (3 / 3)
divDec3 = 5 / 2

addNum = intDec + floatDec
addNum2 = expDec + expDec2
addNum3 = powDec + powDec2

subNum = addNum - negIntDec
subNum2 = 0 - 248

operCheck = subNum * subNum2 ^ divDec / expDec * expDec2 ^ 3
operCheck2 = 0.99 ^ 365
operCheck3 = -111 + 2 ^ 3 * 8 + 34 - 23
// BOOLEAN DECLARATION
boolDec = true
boolDec2 = false

boolCheck = true == false
notEqual = true != false
boolCheck2 = 4 > 1
boolCheck3 = 4 == 4
boolCheck4 = 5 < 9
boolCheck6 = 1 <= 1
boolCheck7 = 4 >= 5
boolCheck9 = 'testString' > 'StringCompare'
concatCheck2 = 'this is a test ' ++ 'folder'

logicalCheck = true && true
logicalCheck2 = false && false
logicalCheck3 = false && true
logicalCheck4 = true && false
logicalCheck5 = true || true
logicalCheck6 = false || false
logicalCheck7 = false || true
logicalCheck8 = true || false

logicalCheck9 = 1 && 2
logicalCheck13 = 5 > 4 && 6 > 4 && 7 < 0 && true > false
logicalCheck14 = true > false
logicalCheck16 = true == true
logicalCheck17 = -1 == -4 + 3
logicalCheck18 = -1 != 1.31431
logicalCheck20 = 23 > 2 ^ 2
logicalCheck21 = 10 ^ 5 && 1e+5
logicalCheck23 = 1e+2 + 2e+3
logicalCheck24 = 5 > 1 == (9 != 9)

// ARRAYS
arrayCheck = []
arrayCheck2 = [   ]
arrayCheck3 = [1, 2, 2.334, 1e+4, true, 'str', 2 + 4, 4 ^ 4, 3 % 3, 2 > 1, 2 || true, 'dtr' ++ '675', 5 && 4]
arrayCheck4 = [1, 2,{a : 23, b:[]} ]
arrayCheck5 = [, 23, , , 44, ,]
arrayCheck6 = [1, ['str', [true, false, [1.315, [], 1e+4]]]]

//OBJECTS
objectCheck = {}
objectCheck2 = {  }
objectCheck3 = {a: {}}
objectCheck4 = {
                  a : 23,
                  4 : 'str',
                  'string' : 's',
                  b : true,
                  c : [2, true],
                  e : {
                        'happy': 1 + 2,
                        '_sad' : 1 > 3 % 1
                      },
                  f : [
                        {
                         'js' : 'foobar'
                        },
                        {
                         'cd' : [
                                  {
                                    obj : [, 'nine']
                                  }
                                ]
                        }
                      ]
               }

// ARRAY-SUBSCRIPTING -- MEMBER-EXPRESSIONS
arrSubs = arrayCheck3[0]
arrSubs2 = arrayCheck3[0] + 4 + arrayCheck3[1]
arrSubs3 = arrayCheck3[0] > arrayCheck3[1] + 2
arrSubs4 = arrayCheck3[1] + 1 + 4
arrSubs5 = arrayCheck3[0] && arrayCheck3[1] + 234

// Member check

memCheck = objectCheck3.a
memCheck2 = objectCheck4.a
memCheck3 = objectCheck4['string']
memCheck4 = objectCheck4.c[0]
memCheck5 = objectCheck4.c[1]
memCheck6 = objectCheck4.f[0]['js']
memCheck7 = objectCheck4.f[0].js
memCheck8 = objectCheck4.e.['_sad']
memCheck9 = objectCheck4['4']
memCheck10 = objectCheck4.f[1].cd[0].obj
memCheck11 = objectCheck4.f[1].cd[0]['obj']
memCheck12 = objectCheck4.f[1].cd[0]['obj'][0]
memCheck13 = objectCheck4.f[1].cd[0]['obj']

// should fail
//boolCheck5 = 5 < 'string'
//strNumAdd = 5 + 'string'
// boolCheck8 = 5 <= 'clean'
//boolCheck10 = true > 1
//concatCheck = 1 ++ 3
//concatCheck3 = 'clean' ++ 01235
// concatCheck4 = 01234 ++ 'afnbf'
// concatCheck5 = true ++ false
// concatCheck6 = true ++ 1
//logicalCheck11 = 1 && 'dack'
// logicalCheck10 = 1 && true
//logicalCheck12 = 1 || true
// logicalCheck15 = 7 != 7 && 'garima' ++ ' kamboj'
// logicalCheck19 = -4 == 'clean'
// logicalCheck22 = 10 & 10
// logicalCheck24 = 5 > 1 == 9 != 9
// arrayCheck7 = (['str'] ++ ['tgb'])
// arrSubs3 = arrayCheck3[0] + arrayCheck3[1]
// arrSubs5 = arrayCheck3[1 + 3]
//
