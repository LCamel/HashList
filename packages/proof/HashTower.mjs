"use strict";
import { poseidon } from "circomlibjs"; // for off-line computing
//import { groth16 } from "snarkjs";
//import { ethers } from "ethers";


class HashTower {
    constructor(hashInputCount, H) {
        this.hashInputCount = hashInputCount;
        this.H = H;
        this.list = [];    // for generating circuit inputs
                           // the on-chain HashList doesn't have this field
        //this.length = 0; // since we have this.list, just use its length instead
        this.buf = Array(this.H);
        for (let lv = 0; lv < this.H; lv++) {
            this.buf[lv] = Array(hashInputCount).fill(0); // fill for visual affects only
        }
    }
    hash(arr) {
        //return poseidon(arr);

        // for visualizing
        if (Array.isArray(arr[0])) {
            return [arr[0][0], arr[this.hashInputCount - 1][1]];
        } else {
            return [arr[0], arr[this.hashInputCount - 1]];
        }
    }

    // assuming that we can never fill up the whole tower (TODO)
    add(item) {
        this.profiling = { write: 0, hash: 0 };
        var toAdd = BigInt(item);
        const lvLengths = this.getLevelLengths();
        for (let lv = 0; lv < this.H; lv++) {
            const origLvLen = lvLengths[lv];
            if (origLvLen < this.hashInputCount) {
                this.buf[lv][origLvLen] = toAdd;      this.profiling.write++;
                break;
            } else {
                const hash = this.hash(this.buf[lv]); this.profiling.hash++;
                this.buf[lv].fill(BigInt(0)); // for visualizing only
                                              // we don't really have to clear the whole level
                                              // this step MUST be avoided in the contract
                this.buf[lv][0] = toAdd;              this.profiling.write++;
                toAdd = hash; // to be added in the upper level
            }
        }
        this.list.push(BigInt(item));                 this.profiling.write++; // len
    }
    // in solidity, the memory cost should be considered
    getLevelLengths() {
        const len = this.list.length;
        var lengths = []; // Array(this.H).fill(0);
        var zeroIfLessThan = 0; // 1 + 4 + 16 + 64 + ...
        var pow = 1; // pow = hashInputCount ** lv
        for (let lv = 0; lv < this.H; lv++) {
            zeroIfLessThan += pow;
            const lvLen = (len < zeroIfLessThan) ? 0 : Math.floor((len - zeroIfLessThan) / pow) % this.hashInputCount + 1;
            lengths.push(lvLen);
            if (lvLen == 0) break;
            pow *= this.hashInputCount;
        }
        return lengths;
    }

    show() {
        console.clear();
        for (let lv = this.H - 1; lv >= 0; lv--) {
            var msg = "lv " + lv;
            for (let i = 0; i < this.hashInputCount; i++) {
                msg += "\t" + this.buf[lv][i];
            }
            console.log(msg);
        }
        console.log("\n\n");
        console.log("length: " + this.list.length);
        console.log("profiling:", this.profiling);
        var lengths = this.getLevelLengths(); lengths.pop();
        console.log("level lengths: " + lengths);
        console.log("range: ", ht.getRange(10));
        var start = new Date().getTime(); while (new Date().getTime() < start + 1000);
    }

    getRange(idx) {
        if (idx < 0 || this.list.length <= idx) return undefined;
        const lvLengths = this.getLevelLengths();
        var start = this.list.length;
        var pow = 1;
        for (let lv = 0; lv < this.H; lv++) {
            for (let lvIdx = lvLengths[lv] - 1; lvIdx >= 0; lvIdx--) {
                start -= pow;
                if (start <= idx) {
                    return [lv, lvIdx, start, pow];
                }
            }
            pow *= this.hashInputCount;
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