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
function getFullLengths(count, W) {
    const FL = [];
    for (let lv = 0, z = 0; true; lv++) {
        z += W ** lv;
        if (count < z) break;
        FL.push(Math.floor((count - z) / W ** lv) + 1);
    }
    return FL;
}

t = Tower(4, digestOfRange);
for (let i = 0; i < N; i++) {
    t.add(i);

    let FL = getFullLengths(i + 1, t.W);
    assert(FL.length == t.L.length, "bad FL.length");
    for (let lv = 0; lv < t.L.length; lv++) {
        let fl = FL[lv];
        assert(fl == t.S[lv].length + t.L[lv].length, "bad fl");

        let ll = (fl - 1) % t.W + 1;
        assert(ll == t.L[lv].length, "bad ll");

        let start = fl - ll;
        assert(start * t.W ** lv == t.L[lv].flat()[0], "bad start");
    }
}
