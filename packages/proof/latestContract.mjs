"use strict";
import { ethers } from "ethers";


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

const signer = new ethers.Wallet("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", provider);
const contract = new ethers.Contract(address, [ "function add(uint)" ], signer);

for (let item = 0; item < 21; item++) {
    const txResponse = await contract.add(item);
    //const txReceipt = await txResponse.wait();
}
const length21 = await provider.getStorageAt(address, 0);
console.assert(length21 == 21, "length should be 21");

const W = 4;
const H = 5;
for (let lv = 0; lv < H; lv++) {
    var msg = "";
    for (let i = 0; i < W; i++) {
        msg += " " + await provider.getStorageAt(address, 1 + lv * W + i);
    }
    console.log(msg);
}

// 5703642902925079077973536892547657253027257210241120904109323042937339552649
// 0x0c9c25c15e58dffcccface7fbb300ecfa5c9bbf183dcf83d7061ba2bd1e6a389
