"use strict";
import { poseidon } from "circomlibjs"; // for off-line computing
//import { groth16 } from "snarkjs";
//import { ethers } from "ethers";


const MAX_LEVELS = 32;
class HashTower {
    constructor(hashInputCount) {
        this.hashInputCount = hashInputCount;
        this.list = [];    // for generating circuit inputs
                           // the on-chain HashList doesn't have this field
        //this.length = 0; // since we have this.list, just use its length instead
        this.buf = Array(MAX_LEVELS);
        for (let lv = 0; lv < MAX_LEVELS; lv++) {
            this.buf[lv] = Array(hashInputCount);
        }
    }

    // assuming that we can never fill up the whole tower (TODO!)
    // 1 + 4 + 16
    // 1 + 4
    // 1
    add(item) {
        var toAdd = BigInt(item);
        const lvLengths = this.getLevelLengths();
        for (let lv = 0; lv < MAX_LEVELS; lv++) {
            const origLvLen = lvLengths[lv];
            if (origLvLen < this.hashInputCount) {
                this.buf[lv][origLvLen] = toAdd;
                break;
            } else {
                const hash = poseidon(this.buf[lv]);
                this.buf[lv][0] = toAdd; // we don't have to clear the whole level
                toAdd = hash; // to be added in the upper level
            }
        }
        this.list.push(BigInt(item));
    }
    // in javascript, we can return the whole array of lengths
    // in solidity, the memory cost should be considered
    getLevelLengths() {
        const len = this.list.length;
        var lengths = []; // Array(MAX_LEVELS).fill(0);
        var zeroIfLessThan = 0; // 1 + 4 + 16 + 64 + ...
        var pow = 1; // pow = hashInputCount ** lv
        for (let lv = 0; lv < MAX_LEVELS; lv++) {
            zeroIfLessThan += pow;
            const lvLen = (len < zeroIfLessThan) ? 0 : Math.floor((len - zeroIfLessThan) / pow) % this.hashInputCount + 1;
            lengths.push(lvLen);
            if (lvLen == 0) break;
            pow *= this.hashInputCount;
        }
        return lengths;
    }
    show() {
        console.log("======== show ========")
        for (let lv = MAX_LEVELS - 1; lv >= 0; lv--) {
            if (this.buf[lv].some((item) => item)) {
                var msg = "lv " + lv;
                for (let i = 0; i < this.hashInputCount; i++) {
                    msg += "\t" + this.buf[lv][i];
                }
                console.log(msg);
            }
        }
        console.log(this.getLevelLengths());
    }


    // where is my "root" for the item ?
    generateProof(item) {
        const idx = this.list.indexOf(item);
        if (idx < 0) return undefined;
        for (let lv = MAX_LEVELS - 1; lv >= 0; lv--) {
        }

    }
}

const ht = new HashTower(4);
ht.show();
for (let i = 1; i < 86; i++) {
    ht.add(i);
    ht.show();
}