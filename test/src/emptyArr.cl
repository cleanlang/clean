len [] = 0
len arr = 1 + len (arr.slice 1)


print (len [1,1,2,3,2,1,3])
