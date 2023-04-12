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

var N = 150;
var W = 4;
var H = 4;
var out = Array.from({length: H}, () => Array.from({length: N}, () => 255))
for (var i = 0; i < N; i++) {
    for (var j = add(0, i); j >= 0; j--) {
        out[j][i] = 255 - 40 - j * 40;
    }
}

console.log("P2")
console.log(N, H)
console.log("255")
out.reverse().forEach((x) => console.log(x.join(' ')))

// node cost_diagram.mjs| convert pgm:- -scale 800% -bordercolor white -border 20 /tmp/b.png
