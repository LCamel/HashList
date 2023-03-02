import { strict as assert } from 'node:assert';

function Tower(W, digest) {
    let L = []; // levels[][W]
    function _add(lv, v) {
        if (lv == L.length) {          // new level
            L[lv] = [v];
        } else if (L[lv].length < W) { // not full
            L[lv].push(v);
        } else {                       // full
            const d = digest(L[lv]);
            L[lv] = [v];
            _add(lv + 1, d);           // up
        }
    }
    let add = (item) => _add(0, item);
    return { W, digest, L, add };
}

// digest of continuous index range (for visualization)
// [4, 5, 6, 7] => [4, 7]
// [[16,19], [20,23], [24,27], [28,31]] => [16, 31]
function digestOfRange(vs) {
    var arr = vs.flat();
    return [ arr.at(0), arr.at(-1) ];
}

const N = 150;

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


// Add shifted levels S.  Keep L the same.
function ShiftTower(W, digest) {
    let S = []; // shifted levels (events)
    let L = []; // levels[][W]
    function _add(lv, v) {
        if (lv == L.length) {          // new level
            S[lv] = [];
            L[lv] = [v];
        } else if (L[lv].length < W) { // not full
            L[lv].push(v);
        } else {                       // full
            const d = digest(L[lv]);
            S[lv].push(...L[lv]);      // shift
            L[lv] = [v];
            _add(lv + 1, d);           // up
        }
    }
    let add = (item) => _add(0, item);
    return { W, digest, L, S, add };
}
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