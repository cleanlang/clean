bmiTell bmi
  | bmi <= 18.5 = 'Underweight'
  | bmi <= 25.0 = 'Normal'
  | bmi <= 30.0 = 'Fatty'
  | otherwise   = 'Index overflow'

add x y
  | otherwise = x + y

isZero x
  | x == 0 = true
  | otherwise = false

sign x
  | x < 0 = 'Negative'
  | x > 0 = 'Positive'
