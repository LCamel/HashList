//import { strict as assert } from 'node:assert';
import { assert } from "chai";
import { PolysumTower } from "../src/Dev.mjs";
import { poseidon } from "circomlibjs";
import { ethers } from "ethers";


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
        "function getCountAndDd() public view returns (uint64, uint256)"
    ];
    const signer = new ethers.Wallet("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", provider);
    const contract = new ethers.Contract(address, ABI, signer);
    return contract;
}

function P1(v) {
    return poseidon([v]);
}

const FIELD_SIZE = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
const R = 2n;
const W = 4;

describe("The Contract", function() {
    describe("add", function() {
        it("should update count and dd", async function() {
            const contract = await getContract();
            //console.log("contract address: ", contract.address);
            var [count, dd] = (await contract.getCountAndDd()).map(v => v.toBigInt());
            assert.equal(count, 0n);
            assert.equal(dd, 0n);

            let pt = PolysumTower(W, P1, R, FIELD_SIZE);
            for (let i = 0; i < 150; i++) {
                console.log("=== i: ", i);
                pt.add(i);
                //console.log(pt.dd);

                const txResponse = await contract.add(i);
                const txReceipt = await txResponse.wait();
                //console.log(txReceipt.gasUsed.toBigInt());
                [count, dd] = (await contract.getCountAndDd()).map(v => v.toBigInt());
                assert.equal(count, i + 1);
                assert.equal(dd, pt.dd);
            }
        });
    });
});


