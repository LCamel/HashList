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

var t = Tower(4, digestOfRange);
for (let i = 0; i < 150; i++) {
    t.add(i);

    console.log("\n");
    for (var lv = t.L.length - 1; lv >= 0; lv--) {
        console.log(t.S[lv].join(" ").padStart(70).slice(-70), "#",
            t.L[lv].map(v => v.toString().padStart(7)).join(" "));
    }
}
