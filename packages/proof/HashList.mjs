"use strict";
import { poseidon } from "circomlibjs"; // for off-line computing
import { groth16 } from "snarkjs";

class HashList {
    constructor(hashInputCount) {
        this.hashInputCount = hashInputCount;
        this.list = [];    // for generating circuit inputs
                           // the on-chain HashList doesn't have this field
        //this.length = 0; // since we have this.list, just use its length instead
        this.buf = new Array(hashInputCount);
    }
    add(item) {
        const len = this.list.length;
        if (len <= 1) {
            this.buf[len] = BigInt(item);
        } else {
            const index = (len - 1) % (this.hashInputCount - 1) + 1;
            if (index == 1) {
                this.buf[0] = poseidon(this.buf);
            }
            this.buf[index] = BigInt(item);
        }
        this.list.push(BigInt(item)); // TODO: dedup
    }
    _getZeroPaddedBuffer() {
        // 0 1 2 3 4 5 6 7 8 9 10
        // 0 1 2 3 4 2 3 4 2 3 4
        const len = this.list.length;
        const bound = (len <= 1) ? len : (len - 2) % (this.hashInputCount - 1) + 2;
        const tmp = new Array(this.hashInputCount);
        for (let i = 0; i < this.hashInputCount; i++) {
            tmp[i] = (i < bound) ? this.buf[i] : BigInt(0);
        }
        return tmp;
    }
    generateCircuitInput(depth, arity) {
        // TODO: consider hashCount!

        const len = this.list.length;
        const leafCount = arity ** depth;
        if (len > leafCount) {
            throw "length > arity ** depth";
        }

        var inputs = new Array(leafCount); // TODO: consider hashCount!
        for (let i = 0; i < leafCount; i++) {
            inputs[i] = (i < len) ? this.list[i] : BigInt(0);
        }

        const circuitInput = {
            inputs: inputs,
            length: len,
            outputHashSelector: (len < 2) ? 0 : Math.floor((len - 2) / (this.hashInputCount - 1)),
            buf: this._getZeroPaddedBuffer()
        };

        return circuitInput;
    }
    // returns a promise of the full proof
    generateProof(depth, arity, wasm, zkey) {
        const circuitInput = this.generateCircuitInput(depth, arity);
        return groth16.fullProve(circuitInput, wasm, zkey);
    }
}

const hl = new HashList(4);
for (let i = 1; i <= 16; i++) {
    hl.add(i);
}
//BigInt.prototype.toJSON = function() { return this.toString() }
//console.log(JSON.stringify(hl.generateCircuitInput(4, 2)));

const wasm = "../circuits/out/HashList4Depth4Arity2_js/HashList4Depth4Arity2.wasm";
const zkey = "../circuits/out/HashList4Depth4Arity2_js/HashList4Depth4Arity2_0001.zkey";
const proof = await hl.generateProof(4, 2, wasm, zkey);
console.log(JSON.stringify(proof));