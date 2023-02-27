"use strict";
function Tower(W, digest) {
    let S = []; // shifted levels
    let L = []; // levels
    function _add(lv, v) {
        if (lv == L.length) {          // new level
            S[lv] = [];
            L[lv] = [v];
        } else if (L[lv].length < W) { // not full
            L[lv].push(v);
        } else {                       // full
            const d = digest(L[lv]);
            S[lv].push(...L[lv]);      // shift
            L[lv] = [v];
            _add(lv + 1, d);           // up
        }
    }
    let add = (item) => _add(0, item);
    return { W, digest, L, S, add };
}

function digestOfRange(vs) {
    var arr = vs.flat();
    return [ arr.at(0), arr.at(-1) ];
}

const N = 150;
var t = Tower(4, digestOfRange);
for (let i = 0; i < N; i++) {
    t.add(i);

    console.log("\n");
    for (var lv = t.L.length - 1; lv >= 0; lv--) {
        console.log(t.S[lv].join(" ").padStart(70).slice(-70), "#",
            t.L[lv].map(v => v.toString().padStart(7)).join(" "));
    }
}

const assert = (v, msg) => { if (!v) throw msg };
//t.getCount = () => t.L.reduce((acc, l, i) => acc + l.length * t.W ** i, 0);
//const count = t.getCount();
//console.log("count: ", count);
//assert(count == N, "bad count");


// given a single number "count", can we reconstruct the shape of L ?
function getShape(count) {
    const FL = []; // full length
    const LL = []; // level length
    const START = []; // full level index of the first elements of each level
    for (let lv = 0, z = 0; true; lv++) {
        z += t.W ** lv;
        if (count < z) break;
        let fl = Math.floor((count - z) / t.W ** lv) + 1;
        let ll = (fl - 1) % t.W + 1;
        let start = fl - ll;
        FL.push(fl);
        LL.push(ll);
        START.push(start);
    }
    return [FL, LL, START];
}

t = Tower(4, digestOfRange);
for (let i = 0; i < N; i++) {
    t.add(i);

    let [FL, LL, START] = getShape(i + 1);
    for (let lv = 0; lv < t.L.length; lv++) {
        assert(FL[lv] == t.S[lv].length + t.L[lv].length, "bad FL");
        assert(LL[lv] == t.L[lv].length, "bad LL");
        assert(START[lv] * t.W ** lv == t.L[lv].flat()[0], "bad START");
    }
}

//console.log("FL: ", FL);
//console.log("LL: ", LL);
//console.log("START: ", START);
