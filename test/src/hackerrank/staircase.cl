hash = '#'
space = 5

staircase 0 space hash acc = 0
staircase n space hash acc = staircase (n - 1) (space - 1) (hash.concat '#') (showtree space hash)

showtree space hash = print (((' ').repeat space).concat hash)

staircase 6 space hash ''