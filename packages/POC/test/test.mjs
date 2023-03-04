//import { strict as assert } from 'node:assert';
import { assert } from "chai";
import { Tower, digestOfRange, ShiftTower, getLengths, incDigestOfRange, DigestTower, buildL, buildMerkleProof, verifyMerkleProof, PolysumTower } from "../src/Dev.mjs";
import { poseidon } from "circomlibjs"; // for polysum


describe("Tower", function() {
    describe("add", function() {
        it("should make L have this shape", function() {
            let t = Tower(4, (vs) => '_');
            t.add(0);
            assert.deepEqual(t.L, [[0]]);
            t.add(1);
            assert.deepEqual(t.L, [[0,1]]);
            t.add(2);
            assert.deepEqual(t.L, [[0,1,2]]);
            t.add(3);
            assert.deepEqual(t.L, [[0,1,2,3]]);
            t.add(4);
            assert.deepEqual(t.L, [[4], ['_']]);
            t.add(5);
            assert.deepEqual(t.L, [[4,5], ['_']]);
            t.add(6);
            assert.deepEqual(t.L, [[4,5,6], ['_']]);
            t.add(7);
            assert.deepEqual(t.L, [[4,5,6,7], ['_']]);
            t.add(8);
            assert.deepEqual(t.L, [[8], ['_', '_']]);
            for (let i = 9; i < 150; i++) t.add(i);
            assert.deepEqual(t.L, [[148, 149], ['_'], ['_'], ['_', '_']]);
        });
        it("should fill L with ranges", function() {
            let t = Tower(4, digestOfRange);
            t.add(0);
            assert.deepEqual(t.L, [[0]]);
            t.add(1);
            assert.deepEqual(t.L, [[0,1]]);
            t.add(2);
            assert.deepEqual(t.L, [[0,1,2]]);
            t.add(3);
            assert.deepEqual(t.L, [[0,1,2,3]]);
            t.add(4);
            assert.deepEqual(t.L, [[4], [[0,3]]]);
            t.add(5);
            assert.deepEqual(t.L, [[4,5], [[0,3]]]);
            t.add(6);
            assert.deepEqual(t.L, [[4,5,6], [[0,3]]]);
            t.add(7);
            assert.deepEqual(t.L, [[4,5,6,7], [[0,3]]]);
            t.add(8);
            assert.deepEqual(t.L, [[8], [[0,3], [4,7]]]);
            for (let i = 9; i < 150; i++) t.add(i);
            assert.deepEqual(t.L, [[148, 149], [[144,147]], [[128,143]], [[0,63], [64,127]]]);
        });
    });
});


describe("ShiftTower", function() {
    describe("add", function() {
        it("should fill L and S with ranges", function() {
            let t = ShiftTower(4, digestOfRange);
            t.add(0);
            assert.deepEqual(t.L, [[0]]);
            assert.deepEqual(t.S, [[]]);
            t.add(1);
            assert.deepEqual(t.L, [[0,1]]);
            assert.deepEqual(t.S, [[]]);
            t.add(2);
            assert.deepEqual(t.L, [[0,1,2]]);
            assert.deepEqual(t.S, [[]]);
            t.add(3);
            assert.deepEqual(t.L, [[0,1,2,3]]);
            assert.deepEqual(t.S, [[]]);
            t.add(4);
            assert.deepEqual(t.L, [[4], [[0,3]]]);
            assert.deepEqual(t.S, [[0,1,2,3],[]]);
            t.add(5);
            assert.deepEqual(t.L, [[4,5], [[0,3]]]);
            assert.deepEqual(t.S, [[0,1,2,3],[]]);
            t.add(6);
            assert.deepEqual(t.L, [[4,5,6], [[0,3]]]);
            assert.deepEqual(t.S, [[0,1,2,3],[]]);
            t.add(7);
            assert.deepEqual(t.L, [[4,5,6,7], [[0,3]]]);
            assert.deepEqual(t.S, [[0,1,2,3],[]]);
            t.add(8);
            assert.deepEqual(t.L, [[8], [[0,3], [4,7]]]);
            assert.deepEqual(t.S, [[0,1,2,3,4,5,6,7],[]]);

            for (let i = 9; i < 150; i++) t.add(i);
            assert.deepEqual(t.L, [[148, 149], [[144,147]], [[128,143]], [[0,63], [64,127]]]);
            assert.equal(t.S[0][0], 0);
            assert.equal(t.S[0][147], 147);
            assert.deepEqual(t.S[1][0], [0,3]);
            assert.deepEqual(t.S[1][35], [140,143]);
            assert.deepEqual(t.S[2][0], [0,15]);
            assert.deepEqual(t.S[2][7], [112,127]);
            assert.deepEqual(t.S[3], []);
        });
    });
});


describe("getLengths", function() {
    it("should compute FL(full length) and LL(level length) based on count and W", function() {
        let t = ShiftTower(4, digestOfRange);
        for (let i = 0; i < 150; i++) {
            t.add(i);
            let count = i + 1;
            let [FL, LL] = getLengths(count, t.W);
            assert.equal(FL.length, t.L.length);
            assert.equal(LL.length, t.L.length);
            for (let lv = 0; lv < t.L.length; lv++) {
                assert.equal(FL[lv], t.S[lv].length + t.L[lv].length);
                assert.equal(LL[lv],                  t.L[lv].length);
                assert.equal((FL[lv] - LL[lv]) * t.W ** lv, t.L[lv].flat()[0], "start");
            }
        }
    });
});


describe("DigestTower", function() {
    it("should have digests that match with the original version", function() {
        let t = Tower(4, digestOfRange);
        let dt = DigestTower(4, incDigestOfRange);
        for (let i = 0; i < 150; i++) {
            t.add(i);
            dt.add(i);

            // verify D
            assert.equal(dt.D.length, t.L.length);
            for (let lv = 0; lv < t.L.length; lv++) {
                assert.deepEqual(dt.D[lv], t.L[lv].reduce(dt.incDigest, undefined));
            }
        }
    });
});

describe("buildL", function() {
    it("should build L from E by 'count'", function() {
        let t = Tower(4, digestOfRange);
        let dt = DigestTower(4, incDigestOfRange);
        for (let i = 0; i < 150; i++) {
            t.add(i);
            dt.add(i);

            let count = i + 1;
            let L = buildL(count, dt.W, dt.E);
            assert.deepEqual(L, t.L);
        }
    });
});


describe("buildMerkleProof", function() {
    it("should build a verifiable Merkle proof", function() {
        let t = Tower(4, digestOfRange);
        let dt = DigestTower(4, incDigestOfRange);
        const eq = (a, b) => Array.isArray(a) ?
            a.length == 2 && b.length == 2 && a[0] == b[0] && a[1] == b[1] : a == b; // for range only

        for (let i = 0; i < 150; i++) {
            t.add(i);
            dt.add(i);

            let count = i + 1;

            // all index [0 .. i] should be provable
            for (let j = 0; j <= i; j++) {
                // build a merkle proof
                let [C, CI] = buildMerkleProof(count, dt.W, dt.E, j);

                // the proof is self-consistent and match with an in-tower root
                let root = t.L[CI.length - 1][CI.at(-1)];
                assert.equal(verifyMerkleProof(C, CI, root, dt.incDigest, eq), true);
            }

            // index i + 1 should not be provable
            let [C, CI] = buildMerkleProof(count, dt.W, dt.E, i + 1);
            assert.equal(C.length, 0);
            assert.equal(CI.length, 0);
        }
    });
});


function P1(v) {
    //return (BigInt(v) + 123n) % FIELD_SIZE;
    return poseidon([v]);
}

describe("PolysumTower", function() {
    const FIELD_SIZE = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
    const R = 2n;

    // If the inputs are considered "safe":
    //   vs[0] * R^1
    // + vs[1] * R^2
    // + vs[2] * R^3
    // + vs[3] * R^4
    function polysum(vs) {
        return vs.reduce((acc, v, i) => acc + v * R ** BigInt(i + 1), 0n) % FIELD_SIZE;
    }
    // If the inputs are considered "non-safe":
    //   P1(vs[0]) * R^1
    // + P1(vs[1]) * R^2
    // + P1(vs[2]) * R^3
    // + P1(vs[3]) * R^4
    function digestByPolysumOfHashValues(vs) {
        return polysum(vs.map((v) => P1([v])));
    }

    describe("add", function() {
        it("should make correct D and dd", function() {
            const W = 4;
            const N = 150;

            // verify PolysumTower
            let t = Tower(W, digestByPolysumOfHashValues);
            let pt = PolysumTower(W, P1, R, FIELD_SIZE);
            let dds = [];
            for (let i = 0n; i < N; i++) {
                t.add(i);
                pt.add(i);
                assert.deepEqual(pt.D, t.L.map(t.digest));
                assert.equal(pt.dd, polysum(pt.D));
                dds.push(pt.dd);
                //if (i < 10) {
                //    console.log("dd after add ", i, " ", pt.dd);
                //    console.log("D: ", pt.D);
                //}
            }
            assert.equal(dds[0], ((P1(0n) * R) * R) % FIELD_SIZE);
            assert.equal(dds[1], ((P1(0n) * R + P1(1n) * R**2n) * R) % FIELD_SIZE);
            assert.equal(dds[2], ((P1(0n) * R + P1(1n) * R**2n + P1(2n) * R**3n) * R) % FIELD_SIZE);
            assert.equal(dds[3], ((P1(0n) * R + P1(1n) * R**2n + P1(2n) * R**3n + P1(3n) * R**4n) * R) % FIELD_SIZE);
            let d03 = (P1(0n) * R + P1(1n) * R**2n + P1(2n) * R**3n + P1(3n) * R**4n) % FIELD_SIZE;
            assert.equal(dds[4], ((P1(4n) * R) * R + (P1(d03) * R) * R**2n) % FIELD_SIZE);
            assert.equal(dds[5], ((P1(4n) * R + P1(5n) * R**2n) * R + (P1(d03) * R) * R**2n) % FIELD_SIZE);
        });
    });
});
