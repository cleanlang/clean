const fact = n => {
    switch (n) {
    case 1:
        return 1;
    default:
        return n * fact(n - 1);
    }
};
console.log(fact(5));