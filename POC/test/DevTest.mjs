//import { strict as assert } from 'node:assert';
import { assert } from "chai";
import { Tower, digestOfRange, LoopTower, LoopDownTower, ShiftTower, getLengths, incDigestOfRange, DigestTower, buildL, buildMerkleProofAndLocateRoot, verifyMerkleProof, PolysumTower } from "../src/Dev.mjs";
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
        it("should work with Poseidon hash", function() {
            let t = Tower(4, poseidon);
            t.add(0n);
            assert.deepEqual(t.L, [[0n]]);
            t.add(1n);
            assert.deepEqual(t.L, [[0n,1n]]);
            t.add(2n);
            assert.deepEqual(t.L, [[0n,1n,2n]]);
            t.add(3n);
            assert.deepEqual(t.L, [[0n,1n,2n,3n]]);
            t.add(4n);
            assert.deepEqual(t.L, [[4n], [poseidon([0n,1n,2n,3n])]]);
            t.add(5n);
            assert.deepEqual(t.L, [[4n,5n], [poseidon([0n,1n,2n,3n])]]);
            for (let i = 6n; i <= 20n; i++) {
                t.add(i);
            }
            assert.deepEqual(t.L, [[20n], [poseidon([16n,17n,18n,19n])], [poseidon([poseidon([0n,1n,2n,3n]), poseidon([4n,5n,6n,7n]), poseidon([8n,9n,10n,11n]), poseidon([12n,13n,14n,15n])])]]);
        });
    });
});

describe("LoopTower", function() {
    describe("add", function() {
        it("should have the same result as Tower", function() {
            let t = Tower(4, digestOfRange);
            let lt = LoopTower(4, digestOfRange);
            for (let i = 0; i < 150; i++) {
                t.add(i);
                lt.add(i);
                assert.deepEqual(t.L, lt.L);
            }
        });
    });
});

describe("LoopDownTower", function() {
    describe("add", function() {
        it("should have the same result as Tower", function() {
            let t = Tower(4, digestOfRange);
            let lt = LoopDownTower(4, digestOfRange);
            for (let i = 0; i < 150; i++) {
                t.add(i);
                lt.add(i);
                assert.deepEqual(t.L, lt.L);
            }
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
            let L = buildL(count, dt.W, (lv, start, len) => dt.E[lv].slice(start, start + len));
            assert.deepEqual(L, t.L);
        }
    });
});


describe("buildMerkleProofAndLocateRoot", function() {
    it("should be able to build a verifiable Merkle proof for each added item", function() {
        let t = Tower(4, digestOfRange);
        let dt = DigestTower(4, incDigestOfRange);

        const eventFetcher = (lv, start, len) => dt.E[lv].slice(start, start + len);
        const eq = (a, b) => Array.isArray(a) ?
            a.length == 2 && b.length == 2 && a[0] == b[0] && a[1] == b[1] : a == b; // for range only

        for (let i = 0; i < 150; i++) {
            t.add(i);
            dt.add(i);

            let count = i + 1;

            // all index [0 .. i] should be provable
            for (let j = 0; j <= i; j++) {
                // build a merkle proof
                let [C, CI, rootLevel, rootIdxInL] = buildMerkleProofAndLocateRoot(count, dt.W, eventFetcher, j);

                // the proof is self-consistent and match with an in-tower root
                assert.equal(verifyMerkleProof(C, CI, dt.incDigest, eq), true);
                assert.deepEqual(C.at(-1)[CI.at(-1)], t.L[rootLevel][rootIdxInL]);
            }

            // index i + 1 should not be provable
            let [C, CI, rootLevel, rootIdxInL] = buildMerkleProofAndLocateRoot(count, dt.W, eventFetcher, i + 1);
            assert.equal(C.length, 0);
            assert.equal(CI.length, 0);
            assert.equal(rootLevel, -1);
            assert.equal(rootIdxInL, -1);
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

            t.add(0);
            pt.add(0);
            assert.equal(pt.dd, polysum(pt.D));
            assert.equal(pt.dd, ((P1(0n) * R) * R) % FIELD_SIZE);
            t.add(1);
            pt.add(1);
            assert.equal(pt.dd, polysum(pt.D));
            assert.equal(pt.dd, ((P1(0n) * R + P1(1n) * R**2n) * R) % FIELD_SIZE);
            t.add(2);
            pt.add(2);
            assert.equal(pt.dd, polysum(pt.D));
            assert.equal(pt.dd, ((P1(0n) * R + P1(1n) * R**2n + P1(2n) * R**3n) * R) % FIELD_SIZE);
            t.add(3);
            pt.add(3);
            assert.equal(pt.dd, polysum(pt.D));
            assert.equal(pt.dd, ((P1(0n) * R + P1(1n) * R**2n + P1(2n) * R**3n + P1(3n) * R**4n) * R) % FIELD_SIZE);
            let d03 = (P1(0n) * R + P1(1n) * R**2n + P1(2n) * R**3n + P1(3n) * R**4n) % FIELD_SIZE;
            t.add(4);
            pt.add(4);
            assert.equal(pt.dd, polysum(pt.D));
            assert.equal(pt.dd, ((P1(4n) * R) * R
                                 + (P1(d03) * R) * R**2n) % FIELD_SIZE);
            t.add(5);
            pt.add(5);
            assert.equal(pt.dd, polysum(pt.D));
            assert.equal(pt.dd, ((P1(4n) * R + P1(5n) * R**2n) * R
                                 + (P1(d03) * R) * R**2n) % FIELD_SIZE);
            t.add(6);
            pt.add(6);
            assert.equal(pt.dd, polysum(pt.D));
            assert.equal(pt.dd, ((P1(4n) * R + P1(5n) * R**2n + P1(6n) * R**3n) * R
                                 + (P1(d03) * R) * R**2n) % FIELD_SIZE);
            t.add(7);
            pt.add(7);
            assert.equal(pt.dd, polysum(pt.D));
            assert.equal(pt.dd, ((P1(4n) * R + P1(5n) * R**2n + P1(6n) * R**3n + P1(7n) * R**4n) * R
                                 + (P1(d03) * R) * R**2n) % FIELD_SIZE);
            let d47 = (P1(4n) * R + P1(5n) * R**2n + P1(6n) * R**3n + P1(7n) * R**4n) % FIELD_SIZE;
            t.add(8);
            pt.add(8);
            assert.equal(pt.dd, polysum(pt.D));
            assert.equal(pt.dd, ((P1(8n) * R) * R
                                 + (P1(d03) * R + P1(d47) * R**2n) * R**2n) % FIELD_SIZE);
            for (let i = 9n; i < N; i++) {
                t.add(i);
                pt.add(i);
                assert.deepEqual(pt.D, t.L.map(t.digest));
                assert.equal(pt.dd, polysum(pt.D));
                //if (i < 10) {
                //    console.log("dd after add ", i, " ", pt.dd);
                //    console.log("D: ", pt.D);
                //}
            }
        });
    });
});
