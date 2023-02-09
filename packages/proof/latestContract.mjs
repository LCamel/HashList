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

var slot = 0;
const length = await provider.getStorageAt(address, slot++);

const W = 4;
const H = 5;
for (let lv = 0; lv < H; lv++) {
    var msg = "";
    for (let i = 0; i < W; i++) {
        msg += " " + await provider.getStorageAt(address, slot++);
    }
    console.log(msg);
}
