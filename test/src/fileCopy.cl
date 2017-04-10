include node-core
main = do
  data <- readFile process.argv[2]
  writeFile process.argv[3] data
