a = [1,2,3,4,5]

add a b = a + b


len = a.length - 1
total = a.reduce add

first = a[0]

last = a[len]

min = total - last
max = total - first

print min max