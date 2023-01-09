"use strict";
import { poseidon } from "circomlibjs"; // for off-line computing
import { groth16 } from "snarkjs";
import { ethers } from "ethers";

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
    generateFullProof(depth, arity, wasm, zkey) {
        const circuitInput = this.generateCircuitInput(depth, arity);
        return groth16.fullProve(circuitInput, wasm, zkey);
    }
}

const hl = new HashList(4);
for (let i = 1; i <= 16; i++) {
    hl.add(i);
}
BigInt.prototype.toJSON = function() { return this.toString() }
console.log(JSON.stringify(hl.generateCircuitInput(4, 2)));

const wasm = "../circuits/out/HashList4Depth4Arity2_js/HashList4Depth4Arity2.wasm";
const zkey = "../circuits/out/HashList4Depth4Arity2_js/HashList4Depth4Arity2_0001.zkey";
const fullProof = await hl.generateFullProof(4, 2, wasm, zkey);
console.log(JSON.stringify(fullProof));

const provider = new ethers.providers.JsonRpcProvider(); // local
const signer = new ethers.Wallet("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", provider);
const hashList4Test = new ethers.Contract(
    "0x91543DFA0011ad7C53B38D6de9bCE9aA189B4941",
    [
        "function add(uint item) public",
        "function verifyMerkleRoot(uint256[2] memory a, uint256[2][2] memory b, uint256[2] memory c, uint256 depth, uint256 arity, uint256 root) public view returns (bool)",
    ],
    provider
    );

const verifier = new ethers.Contract(
    "0xf3FAdCE461eF884d3c12819FeC77964501B907B9",
    [
        "function verifyProof( uint[2] memory a, uint[2][2] memory b, uint[2] memory c, uint[7] memory input) public view returns (bool r)",
    ],
    provider
    );

// beware of the order!
const proof = fullProof.proof;
const a = [ proof.pi_a[0], proof.pi_a[1] ];
const b = [[ proof.pi_b[0][1], proof.pi_b[0][0] ],
           [ proof.pi_b[1][1], proof.pi_b[1][0] ]];
const c = [ proof.pi_c[0],  proof.pi_c[1] ];
const root = fullProof.publicSignals[0];

const verifyResult = await hashList4Test.verifyMerkleRoot(a, b, c, 4, 2, root);
console.log("verifyResult: ", verifyResult);

/*
//const verifyResult = await verifier.verifyProof(a, b, c, [root,0,0,0,0,0,0]);
//console.log("verifyResult: ", verifyResult);
const verifyResult = await verifier.verifyProof(["0x06f30d1f7c27a6e151ea7eb48479ed89d5c269a8c1ab0bfc6b2a12efcf25132b", "0x1e545183814defd8831bcf2b3888b59aa393ae75b5d6ae17e7fbbada7a3bc59e"],[["0x086f824bd77a7954fc38fb16264370e4f866e7a42b39fb79869603284a4d97c2", "0x24ac3343df3fe1605a586bd8b525a281f6675811815c98fbecb243ffa8718741"],["0x1d58a5b0d1d7979668d8158ec3c45911ad662b5986858825fa9be62509d41c5a", "0x0bc9ee103083e21364a68be539e7091130acd50aeaa1f876621f74930ab17f8e"]],["0x111e16a5c06deff5e31757f218e004fd2126475f749bd3f160109f45fab982f3", "0x03b6b51bac2cf10024baa4b690c6f1c13bd437f8ed3af879c1617a07756a1a2b"],["0x07f9d837cb17b0d36320ffe93ba52345f1b728571a568265caac97559dbc952a","0x0000000000000000000000000000000000000000000000000000000000000000","0x0000000000000000000000000000000000000000000000000000000000000000","0x0000000000000000000000000000000000000000000000000000000000000000","0x0000000000000000000000000000000000000000000000000000000000000000","0x0000000000000000000000000000000000000000000000000000000000000000","0x0000000000000000000000000000000000000000000000000000000000000000"]);
console.log("verifyResult: ", verifyResult);
*/
