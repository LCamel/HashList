var W = 4;
var L = [];

function add(lv, v) {
    if (lv == L.length) {           // new level
        L.push([v]);
    } else if (L[lv].length < W) {  // not full
        L[lv].push(v);
    } else {                        // full
        var d = digest(L[lv]);
        L[lv] = [v];
        return add(lv + 1, d);      // tail recursion
    }
    return lv;
}
function digest(vs) { return 1 }

var N = 30;
var W = 4;
var H = 4;
var out = Array.from({length: H}, () => Array.from({length: N}, () => 1))
for (var i = 0; i < N; i++) {
    for (var j = add(0, i); j >= 0; j--) {
        out[j][i] = 0;
    }
}

console.log("P1")
console.log(N, H)
out.reverse().forEach((x) => console.log(x.join(' ')))

// npx ts-node a.ts | convert pbm:- -scale 800% -bordercolor black -border 20 /tmp/b.png
