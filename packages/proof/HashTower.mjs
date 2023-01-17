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
        const len = this.list.length;
        var biItem = BigInt(item);
        var zeroPrefixLen = 0;
        for (let lv = 0; lv < MAX_LEVELS; lv++) {
            zeroPrefixLen += this.hashInputCount ** lv;
            const origLvLen = (len < zeroPrefixLen) ? 0 : Math.floor((len - zeroPrefixLen) / (this.hashInputCount ** lv)) % this.hashInputCount + 1;
            if (origLvLen < this.hashInputCount) {
                this.buf[lv][origLvLen] = biItem;
                break;
            } else {
                const hash = poseidon(this.buf[lv]);
                this.buf[lv][0] = biItem;
                biItem = hash; // to be processed in the upper level
            }
        }
        this.list.push(BigInt(item));
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
    }

}

const ht = new HashTower(4);
for (let i = 1; i < 86; i++) {
    ht.add(i);
    ht.show();
}