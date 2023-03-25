import { assert } from "chai";
import { DigestDigestTower, proofForSolidity } from "../src/Dev.mjs";
//import { buildL, buildMerkleProofAndLocateRoot, padInput } from "../src/Proof.mjs";
import { poseidon } from "circomlibjs";
//import { ethers } from "ethers";
//import { groth16 } from "snarkjs";
//import * as fs from "fs";

/*
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
        "function getCountAndDd() public view returns (uint256, uint256)",
        "function prove(uint[2] memory a, uint[2][2] memory b, uint[2] memory c) external view returns (bool)",
    ];
    const signer = new ethers.Wallet("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", provider);
    const contract = new ethers.Contract(address, ABI, signer);
    return contract;
}

function P1(v) {
    return poseidon([v]);
}
*/
function P2(v1, v2) {
    return poseidon([v1, v2]);
}

/*
const FIELD_SIZE = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
//const R = 2n;
const R = 18394430908091344617384880311697507424035533102877559791950913628996628114390n;
const W = 4;

const H = 4;

const circuit = "HashTowerWithHashListH20W4";
const WASM = fs.readFileSync(`./out/${circuit}_js/${circuit}.wasm`);
const ZKEY = fs.readFileSync(`./out/${circuit}_js/${circuit}_0001.zkey`);
*/

describe("The Contract", function() {
    this.timeout(200000);
    describe("add", function() {
        it("should update count and dd", async function() {
            const HashTowerWithHashList = await ethers.getContractFactory("HashTowerWithHashList");
            const contract = await HashTowerWithHashList.deploy();
            /*
            async function eventFetcher(lv, start, len) {
                //console.log("eventFetcher(): lv: ", lv, " start: ", start, " len: ", len);
                const indexes = [];
                for (let i = start; i < start + len; i++) indexes.push(i);
                const filter = contract.filters.Add(lv, indexes);
                const events = await contract.queryFilter(filter);
                return events.map((e) => e.args.value.toBigInt());
            }
            */

            //console.log("contract address: ", contract.address);
            var [count, dd] = (await contract.getCountAndDd()).map(v => v.toBigInt());
            assert.equal(count, 0n);
            assert.equal(dd, 0n);

            let incDigest = (acc, v, i) => (i == 0) ? v : P2(acc, v);
            let incDigestDigest = incDigest;
            let dt = DigestDigestTower(4, incDigest, incDigestDigest);
            let gas = [];
            for (let i = 0; i < 1; i++) {
                console.log("=== i: ", i);
                let oldEventCounts = dt.E.map(e => e.length);
                dt.add(i);
                let eventCountDiff = dt.E.map((e, lv) => e.length - (oldEventCounts[lv] || 0));


                const txResponse = await contract.add(i);
                const txReceipt = await txResponse.wait();
                console.log("add: gasUsed: ", txReceipt.gasUsed.toNumber());
                gas.push(txReceipt.gasUsed.toNumber());
                [count, dd] = (await contract.getCountAndDd()).map(v => v.toBigInt());
                assert.equal(count, i + 1);
                assert.equal(dd, dt.dd);
                console.log(dd);


                assert.equal(txReceipt.events.length, eventCountDiff.reduce((acc, d) => acc + d));
                let events = txReceipt.events.reverse(); // might be top down
                for (let lv = 0; lv < eventCountDiff.length; lv++) {
                    if (eventCountDiff[lv] > 0) {
                        assert.equal(eventCountDiff[lv], 1);
                        let event = events[lv].args;
                        assert.equal(event[0], lv);
                        assert.equal(event[1], dt.E[lv].length - 1);
                        assert.equal(event[2], dt.E[lv].at(-1));
                        // TODO: topic test
                    }
                }



/*
                for (let j = 0; j <= i; j++) {
                    count = Number(count);
                    let L = buildL(count, W, eventFetcher);
                    L = await Promise.all(L);
                    //console.log("L: ", L);
                    let [C, CI, rootLevel, rootIdxInL] = buildMerkleProofAndLocateRoot(count, W, eventFetcher, j);
                    if (!C.length) continue;
                    C = await(Promise.all(C));
                    //console.log(C);
                    //console.log(CI);
                    //console.log(rootLevel);
                    //console.log(rootIdxInL);

                    let input = padInput(W, H, dd, L, C, CI, rootLevel, rootIdxInL);

                    const { proof, publicSignals } = await groth16.fullProve(input, WASM, ZKEY);
                    //console.log(proof);
                    //console.log(publicSignals);


                    console.log("calling contract.prove()...");
                    const [a, b, c] = proofForSolidity(proof);
                    const isValid = await contract.prove(a, b, c);
                    assert(isValid);

                    const gas = await contract.estimateGas.prove(a, b, c);
                    console.log("estimated gas: " + gas);
                    //console.log("done: i: ", i, " j: ", j, "\n");
                }
                */
            }
            let sum = gas.reduce((acc, v) => acc + v);
            let avg = sum / gas.length;
            console.log("gas: sum: ", sum, " avg: ", avg, " all: ", JSON.stringify(gas));
        });
    });
});


