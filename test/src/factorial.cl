include node-core
factorial 1 = 1
factorial n = n * factorial (n - 1)

main = putLine (factorial 5)
