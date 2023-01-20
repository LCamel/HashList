"use strict";
import { poseidon } from "circomlibjs"; // for off-line computing

class HashTower {
    constructor(W, H) {
        this.W = W;
        this.H = H;
        this.length = 0;
        this.buf = Array(H);
        for (let lv = 0; lv < H; lv++) {
            this.buf[lv] = Array(W).fill('_'); // fill _ for visual affects only
        }
    }
    hash(arr) {
        //return poseidon(arr);

        // for visualizing
        if (Array.isArray(arr[0])) {
            return [arr[0][0], arr[this.W - 1][1]];
        } else {
            return [arr[0], arr[this.W - 1]];
        }
    }

    // assuming that we can never fill up the whole tower (TODO)
    add(item) {
        this.profiling = { write: 0, hash: 0 };
        var toAdd = BigInt(item);
        const lvLengths = this.getLevelLengths();
        for (let lv = 0; lv < this.H; lv++) {
            const origLvLen = lvLengths[lv];
            if (origLvLen < this.W) {
                this.buf[lv][origLvLen] = toAdd;      this.profiling.write++;
                break;
            } else {
                const hash = this.hash(this.buf[lv]); this.profiling.hash++;
                this.buf[lv].fill('_'); // for visualizing only
                                        // we don't really have to clear the whole level
                                        // this step MUST be avoided in the contract
                this.buf[lv][0] = toAdd;              this.profiling.write++;
                toAdd = hash; // to be added in the upper level
            }
        }
        this.length++;                                this.profiling.write++;
    }
    // returns a zero-terminated list
    // in solidity, the memory cost should be considered
    getLevelLengths() {
        const len = this.length;
        var lengths = []; // Array(this.H).fill(0);
        var zeroIfLessThan = 0; // 1 + 4 + 16 + 64 + ...
        var pow = 1; // pow = this.W ** lv
        for (let lv = 0; lv < this.H; lv++) {
            zeroIfLessThan += pow;
            const lvLen = (len < zeroIfLessThan) ? 0 : Math.floor((len - zeroIfLessThan) / pow) % this.W + 1;
            lengths.push(lvLen);
            if (lvLen == 0) break;
            pow *= this.W;
        }
        return lengths;
    }

    show() {
        console.clear();
        for (let lv = this.H - 1; lv >= 0; lv--) {
            var msg = "lv " + lv;
            for (let i = 0; i < this.W; i++) {
                msg += "\t" + this.buf[lv][i];
            }
            console.log(msg);
        }
        console.log("\n\n");
        console.log("length: " + this.length);
        console.log("profiling:", this.profiling);
        var lengths = this.getLevelLengths(); lengths.pop();
        console.log("level lengths: " + lengths);
        console.log("getPositions(0): ", ht.getPositions(0));
        var start = new Date().getTime(); while (new Date().getTime() < start + 1000);
    }

    getPositions(idx) {
        if (idx < 0 || this.length <= idx) return undefined;
        const lvLengths = this.getLevelLengths();
        var start = this.length;
        var pow = 1;
        for (let lv = 0; lv < this.H; lv++) {
            for (let lvIdx = lvLengths[lv] - 1; lvIdx >= 0; lvIdx--) {
                start -= pow;
                if (start <= idx) {
                    return [lv, lvIdx, start, pow];
                }
            }
            pow *= this.W;
        }
        return undefined;
    }

}


const ht = new HashTower(4, 16);
ht.show();
for (let i = 0; i < 85; i++) {
    ht.add(i);
    ht.show();
}