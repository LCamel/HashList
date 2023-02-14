"use strict";
import { ethers } from "ethers";
import { poseidon } from "circomlibjs";
import { groth16 } from "snarkjs";


const provider = new ethers.providers.JsonRpcProvider();
const account = (await provider.listAccounts())[0]; // ?
var nonce = await provider.getTransactionCount(account);
var address;
while (nonce >= 0) {
    address = ethers.utils.getContractAddress({from: account, nonce: nonce});
    if ((await provider.getCode(address)).length > 2) break;
    nonce--;
}
console.log("address: ", address);


const length0 = await provider.getStorageAt(address, 0);
console.assert(length0 == 0, "length should be 0");

// TODO: 2D array type is now hard-coded in lengthAndLevels()
// WARNING: just copy and paste the function prototype will get CALL_EXCEPTION!
const ABI = [
    "event Add(uint8 indexed level, uint64 indexed lvFullIndex, uint256 value)",
    "function add(uint)",
    "function prove(uint[2] memory a, uint[2][2] memory b, uint[2] memory c) external view returns (bool)",
    "function lengthAndLevels() public view returns (uint64, uint256[][] memory)"
];
const signer = new ethers.Wallet("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", provider);
const contract = new ethers.Contract(address, ABI, signer);

console.log("adding items...")
for (let item = 1; item <= 6; item++) {
    console.log(item);
    const txResponse = await contract.add(item);
    const txReceipt = await txResponse.wait();
}
const length6 = await provider.getStorageAt(address, 0);
console.assert(length6 == 6, "length should be 6");

//console.log("fetching events...");
//const filter = contract.filters.Add(0, [2, 3]);
//const events = await contract.queryFilter(filter);
//console.log(events.length);
//console.log(events[0]);


async function getEvents(lv, chStart, chEnd) { // end exclusive
    console.log("in getEvents(): lv: ", lv, " chStart: ", chStart, " chEnd: ", chEnd);
    const indexes = [];
    for (let i = chStart; i < chEnd; i++) indexes.push(i);
    const filter = contract.filters.Add(lv, indexes);
    const events = await contract.queryFilter(filter);
    return events.map((e) => e.args.value.toBigInt());
}

console.log("calling lengthAndLevels...");
const lengthAndLevels = await contract.lengthAndLevels();
const length = lengthAndLevels[0].toNumber(); // 2^53 should be enough
const levels = lengthAndLevels[1].map((row) => row.map((v) => v.toBigInt()));
const H = levels.length;
const W = levels[0].length;
const lv0Len = length < 1 ? 0 : (length - 1) % W + 1;

console.log("===========");
console.log("H: ", H, " W: ", W, " lv0Len: ", lv0Len);
console.log("levels: ", levels);


async function generateMerkleProofFromEvents(W, H, itemIdx) {
    const ZERO = 0n;
    const HASH = poseidon;

    const childrens = [];
    const indexes = [];
    var lvFullIdx = itemIdx;
    for (let lv = 0; lv < H; lv++) {
        const chIdx = lvFullIdx % W;
        const chStart = lvFullIdx - chIdx;
        const events = await getEvents(lv, chStart, chStart + W);
        console.log("events for lv: ", lv, events);
        if (events[chIdx] === undefined) break;
        childrens.push(Array.from({length: W}, (_, i) => i < events.length ? events[i] : ZERO));
        indexes.push(chIdx);
        if (events[W - 1] === undefined) break;
        lvFullIdx = Math.floor(lvFullIdx / W);
    }
    if (childrens.length == 0) return undefined;
    const matchLevel = childrens.length - 1;

    // make it a Merkle proof all the way to the top
    for (let lv = childrens.length; lv < H; lv++) {
        childrens.push(Array.from({length: W}, (_, i) => i == 0 ? HASH(childrens[lv - 1]) : ZERO));
        indexes.push(0);
    }
    return [childrens, indexes, matchLevel];
}

const [childrens, indexes, matchLevel] = await generateMerkleProofFromEvents(W, H, 1);

/*
const filter = contract.filters.Add(1);
const events = await contract.queryFilter(filter);
console.log(events);
*/
const WASM = "../circuits/out/HashTower_js/HashTower.wasm";
const ZKEY = "../circuits/out/HashTower_js/HashTower_0001.zkey";
const INPUT = {
    "lv0Len": lv0Len,
    "levels": levels,
    "childrens": childrens,
    "indexes": indexes,
    "matchLevel": matchLevel
    };
console.log("INPUT: ", INPUT);

console.log("generating groth16.fullProve()...")
const { proof } = await groth16.fullProve(INPUT, WASM, ZKEY);
console.log(proof);

const a = [ proof.pi_a[0], proof.pi_a[1] ];
const b = [[ proof.pi_b[0][1], proof.pi_b[0][0] ], // reversed !
           [ proof.pi_b[1][1], proof.pi_b[1][0] ]];
const c = [ proof.pi_c[0], proof.pi_c[1] ];

console.log("calling contract.prove()...");
const isValid = await contract.prove(a, b, c);
console.log("isValid: " + isValid);
const gas = await contract.estimateGas.prove(a, b, c);
console.log("estimated gas: " + gas);

process.exit(0); // quit ffjavascript workers
