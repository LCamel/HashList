"use strict";
import { poseidon } from "circomlibjs";
var FIELD_SIZE = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
var R = 2n; // for polysum

var W = 4;  // tower width
var L = []; // levels.  width: W  height: infinity
var D = []; // level digests (by poseidon)
var dd;     // digest of digests (by polysum)

var children = new Map();
function _add(lv, v) {
    if (lv == L.length) {           // new level
        L.push([v]);
    } else if (L[lv].length < W) {  // not full
        L[lv].push(v);
    } else {                        // full
        var tmp = L[lv].slice(); tmp.forEach((v) => children.set(v, tmp));
        var d = digest(L[lv]);
        L[lv] = [v];
        _add(lv + 1, d);            // tail recursion
    }
}
function add(v) {
    _add(0, v);
    D = L.map(digest);              // each level has its own digest
    dd = polysum(D);                // and being digested again to a single value
}




// If the inputs are considered "safe":
//   vs[0] * R^1
// + vs[1] * R^2
// + vs[2] * R^3
// + vs[3] * R^4
function polysum(vs) {
    return vs.reduce((acc, v, i) => acc + v * R ** BigInt(i + 1), 0n) % FIELD_SIZE;
}
// If the inputs are considered "non-safe":
//   P1(vs[0]) * R^1
// + P1(vs[1]) * R^2
// + P1(vs[2]) * R^3
// + P1(vs[3]) * R^4
function digestByPolysumOfHashValues(vs) {
    return polysum(vs.map((v) => poseidon([v])));
}
var digest = digestByPolysumOfHashValues;

// If you want to be quantum-safe:
// P1 P2 P2 P2 ...
// P2(P2(P2(P1(vs[0]), vs[1]), vs[2]), vs[3])
//function digestByHashes(vs) {
//    return vs.reduce((acc, v, i) => i == 0 ? poseidon([v]) : poseidon([acc, v]), 0n);
//}
//var digest = digestByHashes;


function show() {
    console.log("====");
    for (let i = L.length - 1; i >= 0; i--) {
        console.log(L[i].join("\t"), "\t", D[i]);
    }
    console.log("dd: ", dd);
}

for (let i = 0n; i < 30; i++) {
    add(i);
    show();
}

var pad = (arr, len, val) => arr.concat(Array(len - arr.length).fill(val));
BigInt.prototype.toJSON = function() { return this.toString() }


var todo = 11n;
var C = [];
var idx = [];
var rootLevel = 0;
while (true) {
    var c = children.get(todo);
    if (c) {
        rootLevel++;
        C.push(c);
        idx.push(c.indexOf(todo));
        todo = digest(c);
    } else {
        C.push(pad([todo], W, 0n));
        idx.push(0);
        break;
    }
}

var H = 16;
L = pad(L, H, []);
var len = L.map((l) => l.length);
L = L.map((l) => pad(l, W, 0n));
var rootIdx = L[rootLevel].indexOf(todo);
C = pad(C, H, []).map((l) => pad(l, W, 0n));
idx = pad(idx, H, 0);

var INPUT = { dd, L, len, rootLevel, rootIdx, C, idx };
console.log(JSON.stringify(INPUT, undefined, 2));
