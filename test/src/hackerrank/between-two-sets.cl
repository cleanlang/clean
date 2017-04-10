a = [2,4]
b = [16,32,96]

gcd 0 b = b
gcd a b = gcd (b % a) a

lcm a b = (a * b) / gcd a b

first = a.reduce lcm
second = b.reduce gcd

betweenTwosets acc a b = if a > b
                          then acc
                          else if b % a == 0
                          then betweenTwosets (acc + 1) (first + a) b
                          else betweenTwosets acc (first + a) b

print (betweenTwosets 0 first second)