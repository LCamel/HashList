"use strict";
import { ethers } from "ethers";
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
console.log(address);


const length0 = await provider.getStorageAt(address, 0);
console.assert(length0 == 0, "length should be 0");

// TODO: 2D array type is now hard-coded in lengthAndLevels()
// WARNING: just copy and paste the function prototype will get CALL_EXCEPTION!
const ABI = [
    "event Add(uint8 indexed level, uint64 indexed lvFullIndex, uint256 value)",
    "function add(uint)",
    "function prove(uint[2] memory a, uint[2][2] memory b, uint[2] memory c) external view returns (bool)",
    "function lengthAndLevels() public view returns (uint64 _length, uint256[2][2] memory _levels)"
];
const signer = new ethers.Wallet("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", provider);
const contract = new ethers.Contract(address, ABI, signer);

for (let item = 1; item <= 6; item++) {
    const txResponse = await contract.add(item);
    const txReceipt = await txResponse.wait();
}
const length6 = await provider.getStorageAt(address, 0);
console.assert(length6 == 6, "length should be 6");

const W = 2; // TODO: load from contract
const H = 2;
const { _length, _levels } = await contract.lengthAndLevels();

const levels = _levels.map((row) => row.map((v) => v.toBigInt()));
console.log("===========");
console.log(_length);
//console.log(_lv0Len);
console.log(_levels);


/*
const filter = contract.filters.Add(1);
const events = await contract.queryFilter(filter);
console.log(events);
*/
const WASM = "../circuits/out/HashTower_js/HashTower.wasm";
const ZKEY = "../circuits/out/HashTower_js/HashTower_0001.zkey";
const INPUT = {
    "lv0Len": 2,
    "levels": levels,
    "childrens": [
        [3, 4],
        ["42424242", "14763215145315200506921711489642608356394854266165572616578112107564877678998"]
    ],
    "indexes": [
        1,
        1
    ],
    "matchLevel": 1
    };



const { proof } = await groth16.fullProve(INPUT, WASM, ZKEY);
console.log(proof);

const a = [ proof.pi_a[0], proof.pi_a[1] ];
const b = [[ proof.pi_b[0][1], proof.pi_b[0][0] ],
           [ proof.pi_b[1][1], proof.pi_b[1][0] ]];
const c = [ proof.pi_c[0],  proof.pi_c[1] ];

const isValid = await contract.prove(a, b, c);
console.log("isValid: " + isValid);

/*
const W = 4;
const H = 5;
for (let lv = 0; lv < H; lv++) {
    var msg = "";
    for (let i = 0; i < W; i++) {
        msg += " " + await provider.getStorageAt(address, 1 + lv * W + i);
    }
    console.log(msg);
}
*/
// 5703642902925079077973536892547657253027257210241120904109323042937339552649
// 0x0c9c25c15e58dffcccface7fbb300ecfa5c9bbf183dcf83d7061ba2bd1e6a389
