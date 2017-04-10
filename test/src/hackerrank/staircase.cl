// link to hackerRank : https://www.hackerrank.com/challenges/staircase
// Print the stairs using space and hash------------------------------------z'


// Concat single character count times to itself
// string count -> string
concatStrType strType count accum = if (count == 0)
                                      then accum
                                          else (concatStrType strType (count - 1) (accum ++ strType))


// concat two strings
// string string number number -> string

produceStep str1 str2 len1 len2 = (concatStrType str1 len1 '') ++ (concatStrType str2 len2 '')



// prints stairs given height of stairs
// height -> string
printStairs h count acc = if (count == h)
                                then (acc ++ (produceStep ' ' '#' (h - count) count))
                                      else (printStairs h (count + 1) (acc ++ (produceStep ' ' '#' (h - count) count ++ '\n')))

print (printStairs 5 1 '')
/*
    #
   ##
  ###
 ####
#####

*/
