"use strict";
function Basic(W, digest) {
    let L = [];
    function _add(lv, v) {
        if (lv == L.length) {
            L[lv] = [v];
        } else if (L[lv].length < W) {
            L[lv].push(v);
        } else {
            const d = digest(L[lv]);
            L[lv] = [v];
            _add(lv + 1, d);
        }
    }
    let add = (item) => _add(0, item);
    let getShape = () => L.map(l => l.length);
    return { W, digest, L, add, getShape };
}
/*
function digest(vs) {
    var tmp = vs.flat();
    return [tmp[0], tmp[tmp.length - 1]];
}
*/

function getShape(len) {
    var t = Basic(4, _ => 1);
    for (let i = 0; i < len; i++) {
        t.add(i);
    }
    return t.getShape();
}

console.log(getShape(25));