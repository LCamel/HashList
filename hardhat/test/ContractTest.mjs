import { assert } from "chai";
import { DigestDigestTower } from "../src/Dev.mjs";
import { poseidon } from "circomlibjs";
import { Poseidon2Code } from "./Poseidon2Code.mjs";

function P2(v1, v2) {
    return poseidon([v1, v2]);
}

describe("The Contract", function() {
    this.timeout(200000);

    before(async function() {
        await network.provider.send("hardhat_setCode", [
            "0xd9145CCE52D386f254917e481eB44e9943F39138",
            Poseidon2Code
            ]);
    });
    describe("add", function() {
        it("should update count and dd", async function() {
            const HashTowerWithHashList = await ethers.getContractFactory("HashTowerWithHashList");
            const contract = await HashTowerWithHashList.deploy();

            var [count, dd] = (await contract.getCountAndDd()).map(v => v.toBigInt());
            assert.equal(count, 0n);
            assert.equal(dd, 0n);

            let incDigest = (acc, v, i) => (i == 0) ? v : P2(acc, v);
            let incDigestDigest = incDigest;
            let dt = DigestDigestTower(4, incDigest, incDigestDigest);
            let gas = [];
            for (let i = 0; i < 150; i++) {
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
            }
            let sum = gas.reduce((acc, v) => acc + v);
            let avg = sum / gas.length;
            console.log("gas: sum: ", sum, " avg: ", avg, " all: ", JSON.stringify(gas));
        });
    });
});


