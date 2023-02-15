"use strict";
import { ethers } from "ethers";
import { poseidon } from "circomlibjs";
import { groth16 } from "snarkjs";


async function getEvents(contract, lv, chStart, chEnd) { // end exclusive
    console.log("in getEvents(): lv: ", lv, " chStart: ", chStart, " chEnd: ", chEnd);
    const indexes = [];
    for (let i = chStart; i < chEnd; i++) indexes.push(i);
    const filter = contract.filters.Add(lv, indexes);
    const events = await contract.queryFilter(filter);
    return events.map((e) => e.args.value.toBigInt());
}

async function generateMerkleProofFromEvents(contract, W, H, itemIdx) {
    const ZERO = 0n;
    const HASH = poseidon;

    const childrens = [];
    const indexes = [];
    var lvFullIdx = itemIdx;
    for (let lv = 0; lv < H; lv++) {
        const chIdx = lvFullIdx % W;
        const chStart = lvFullIdx - chIdx;
        const events = await getEvents(contract, lv, chStart, chStart + W);
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

async function generateCircuitInput(contract, itemIdx) {
    console.log("calling lengthAndLevels...");
    const lengthAndLevels = await contract.lengthAndLevels();
    const length = lengthAndLevels[0].toNumber(); // 2^53 should be enough
    const levels = lengthAndLevels[1].map((row) => row.map((v) => v.toBigInt()));
    const H = levels.length;
    const W = levels[0].length;
    const lv0Len = length < 1 ? 0 : (length - 1) % W + 1;

    //console.log("===========");
    //console.log("H: ", H, " W: ", W, " lv0Len: ", lv0Len);
    //console.log("levels: ", levels);

    const [childrens, indexes, matchLevel] = await generateMerkleProofFromEvents(contract, W, H, itemIdx);

    const input = { lv0Len, levels, childrens, indexes, matchLevel };
    return input;

}
async function getLatestContractAddress(provider, account) {
    var nonce = await provider.getTransactionCount(account);
    var address;
    while (nonce >= 0) {
        address = ethers.utils.getContractAddress({from: account, nonce: nonce});
        if ((await provider.getCode(address)).length > 2) break;
        nonce--;
    }
    return address;
}

async function getContract() {
    const provider = new ethers.providers.JsonRpcProvider();
    const address = await getLatestContractAddress(provider, (await provider.listAccounts())[0]); // from deployer
    const ABI = [
        "event Add(uint8 indexed level, uint64 indexed lvFullIndex, uint256 value)",
        "function add(uint)",
        "function prove(uint[2] memory a, uint[2][2] memory b, uint[2] memory c) external view returns (bool)",
        "function lengthAndLevels() public view returns (uint64, uint256[][] memory)"
    ];
    const signer = new ethers.Wallet("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", provider);
    const contract = new ethers.Contract(address, ABI, signer);
    return contract;
}

const contract = await getContract();
console.log("contract address: ", contract.address);

if ((await contract.lengthAndLevels())[0].toNumber() != 0) {
    console.log("tower is not empty");
    process.exit(1);
}

console.log("adding items...")
for (let i = 0; i < 25; i++) {
    const item = i * 10;
    console.log("adding: ", item);
    const txResponse = await contract.add(item);
    const txReceipt = await txResponse.wait();

    for (let j = 0; j < i + 1; j++) {
        console.log("trying to prove: i: ", i, " j: ", j);
        const WASM = "../circuits/out/HashTower_js/HashTower.wasm";
        const ZKEY = "../circuits/out/HashTower_js/HashTower_0001.zkey";
        const input = await generateCircuitInput(contract, j);
        console.log("the input:");
        console.log(input);
        console.log("generating groth16.fullProve()...")
        const { proof } = await groth16.fullProve(input, WASM, ZKEY);
        console.log(proof);

        const a = [ proof.pi_a[0], proof.pi_a[1] ];
        const b = [[ proof.pi_b[0][1], proof.pi_b[0][0] ], // reversed !
                [ proof.pi_b[1][1], proof.pi_b[1][0] ]];
        const c = [ proof.pi_c[0], proof.pi_c[1] ];

        console.log("calling contract.prove()...");
        const isValid = await contract.prove(a, b, c);
        console.log("isValid: " + isValid);
        if (!isValid) throw "invalid!";
        const gas = await contract.estimateGas.prove(a, b, c);
        console.log("estimated gas: " + gas);
        console.log("done: i: ", i, " j: ", j, "\n");
    }
}
process.exit(0); // quit ffjavascript workers
