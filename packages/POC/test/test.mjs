import { strict as assert } from 'node:assert';
import { Tower, digestOfRange, ShiftTower, getLengths } from "../src/Dev.mjs";


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
