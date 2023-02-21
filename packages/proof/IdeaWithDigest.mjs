"use strict";
import { poseidon } from "circomlibjs";
var FIELD_SIZE = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
var R = 2n; // for polysum

var W = 4;  // tower width
var L = []; // levels.  width: W  height: infinity
var D = []; // level digests (by poseidon)
var DD;     // digest of digests (by polysum)

function _add(lv, v) {
    if (lv == L.length) {           // new level
        L.push([v]);
    } else if (L[lv].length < W) {  // not full
        L[lv].push(v);
    } else {                        // full
        var d = digest(L[lv]);
        L[lv] = [v];
        _add(lv + 1, d);            // tail recursion
    }
}
function add(v) {
    _add(0, v);
    D = L.map(digest);              // each level has its own digest
    DD = polysum(D);                // and being digested again to a single value
}

function digest(vs) {
    return vs.reduce((acc, v) => !acc ? poseidon([v]) : poseidon([acc, v]), undefined);
}
function polysum(vs) {
    return vs.reduce((acc, v, i) => acc + v * R ** BigInt(i + 1), 0n) % FIELD_SIZE;
}

function show() {
    console.log("====");
    for (let i = L.length - 1; i >= 0; i--) {
        console.log(L[i].join("\t"), "\t", D[i]);
    }
    console.log("DD: ", DD);
}

for (let i = 0n; i < 30; i++) {
    add(i);
    show();
}
