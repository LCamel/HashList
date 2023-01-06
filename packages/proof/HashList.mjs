"use strict";
import { poseidon } from "circomlibjs";

class HashList {
    constructor(hashWidth) {
        this.hashWidth = hashWidth;
        this.length = 0;
        this.buf = new Array(hashWidth);
    }
    add(item) {
        const len = this.length;
        if (len <= 1) {
            this.buf[len] = BigInt(item);
        } else {
            const index = (len - 1) % (this.hashWidth - 1) + 1;
            if (index == 1) {
                this.buf[0] = poseidon(this.buf);
            }
            this.buf[index] = BigInt(item);
        }
        this.length = len + 1;
        console.log(">>>> buf");
        for (var i = 0; i < this.hashWidth; i++) {
            console.log(this.buf[i]);
        }
        console.log("<<<< buf");
    }
    hash() {
        // 0 1 2 3 4 5 6 7 8 9 10
        // 0 1 2 3 4 2 3 4 2 3 4
        const len = this.length;
        const bound = (len <= 1) ? len : (len - 2) % (this.hashWidth - 1) + 2;
        const tmp = new Array(this.hashWidth);
        for (let i = 0; i < this.hashWidth; i++) {
            tmp[i] = (i < bound) ? this.buf[i] : BigInt(0);
        }
        return poseidon(tmp);
    }
}


/*
var h = new Array(HASH_COUNT);
h[0] = poseidon([0, 1, 2, 3]);
console.log(h[0]);
h[1] = poseidon([h[0], 4, 5, 6]);
console.log(h[1]);
h[2] = poseidon([h[1], 7, 8, 9]);
console.log(h[2]);
h[3] = poseidon([h[2], 10, 11, 12]);
console.log(h[3]);
h[4] = poseidon([h[3], 13, 14, 15]);
console.log(h[4]);
h[5] = poseidon([h[4], 16, 17, 18]);
console.log(h[5]);
*/

function eq(v1, v2) {
    if (v1 != v2) throw "bad value: " + v1 + " " + v2;
    console.log(v1);
}

console.log("=======");
const hl = new HashList(4);
eq(hl.hash(), poseidon([0, 0, 0, 0]));

console.log("adding 0 1 2 3");
hl.add(0);
eq(hl.hash(), poseidon([0, 0, 0, 0]));
hl.add(1);
eq(hl.hash(), poseidon([0, 1, 0, 0]));
hl.add(2);
eq(hl.hash(), poseidon([0, 1, 2, 0]));
hl.add(3);
eq(hl.hash(), poseidon([0, 1, 2, 3]));

console.log("adding 4 5 6");
hl.add(4);
eq(hl.hash(), poseidon([poseidon([0, 1, 2, 3]), 4, 0, 0]));
hl.add(5);
eq(hl.hash(), poseidon([poseidon([0, 1, 2, 3]), 4, 5, 0]));
hl.add(6);
eq(hl.hash(), poseidon([poseidon([0, 1, 2, 3]), 4, 5, 6]));

console.log("adding 7 8 9");
hl.add(7);
eq(hl.hash(), poseidon([poseidon([poseidon([0, 1, 2, 3]), 4, 5, 6]), 7, 0, 0]));
hl.add(8);
eq(hl.hash(), poseidon([poseidon([poseidon([0, 1, 2, 3]), 4, 5, 6]), 7, 8, 0]));
hl.add(9);
eq(hl.hash(), poseidon([poseidon([poseidon([0, 1, 2, 3]), 4, 5, 6]), 7, 8, 9]));
console.log("adding 10");
hl.add(10);
eq(hl.hash(), poseidon([poseidon([poseidon([poseidon([0, 1, 2, 3]), 4, 5, 6]), 7, 8, 9]), 10, 0, 0]));

console.log("=====");
const hl2 = new HashList(4);
hl2.add(4);
hl2.add(5);
hl2.add(6);
hl2.add(7);
hl2.add(8);
eq(hl2.hash(), poseidon([poseidon([4, 5, 6, 7]), 8, 0, 0]));
