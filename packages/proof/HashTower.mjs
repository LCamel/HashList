"use strict";
import { poseidon } from "circomlibjs"; // for off-line computing

const profiler = {
    read: 0, write: 0, hash: 0,
    r: function() { this.read++ },
    w: function() { this.write++ },
    h: function() { this.hash++ },
    toString: function() { return `read: ${this.read} write: ${this.write} hash: ${this.hash}` }
};

// 4^0 + 4^1 + ... + 4^12 = 22369621,  4^0 + 4^1 + ... + 4^19 = 366503875925
const W = 4;
const H = 12;
const DEBUG_RANGE = true;

// simulating a Solidity storage struct
class HashTowerData {
    constructor() {
        this.length = 0;
        this.buf = Array.from({length: H}, () => Array(W).fill('_')); // fill _ for visual affects only
    }
    getLength()        { profiler.r(); return this.length; }
    setLength(l)       { profiler.w(); this.length = l; }
    getBuf(lv, idx)    { profiler.r(); return this.buf[lv][idx]; }
    setBuf(lv, idx, v) { profiler.w(); this.buf[lv][idx] = v; }
}

const events = Array.from({length: H}, () => []);
function emit(lv, lvIdx, val) {
    //console.log("emit: lv: ", lv, " lvIdx: ", lvIdx, " val: ", val);
    events[lv][lvIdx] = val;
}
function getEvents(lv, start, end) {
    return events[lv].slice(start, end); // end exclusive
}

// simulating a Solidity library
class HashTower {
    hash(arr) {
        profiler.h();
        return !DEBUG_RANGE ? poseidon(arr) : [arr[0][0], arr[W - 1][1]];
    }
    add(self, item) {
        const len = self.getLength(); // use the length before adding the item
        const lvFullLengths = this.getLevelFullLengths(len);

        var toAdd = !DEBUG_RANGE ? BigInt(item) : [len, len]; // orig len == current idx

        for (let lv = 0; lv < H; lv++) {
            const lvLen = this.toPartialLength(lvFullLengths[lv]);
            if (lvLen < W) {
                self.setBuf(lv, lvLen, toAdd);
                emit(lv, lvFullLengths[lv], toAdd);
                break;
            } else {
                const bufOfLv = Array.from({length: W}, (v, i) => self.getBuf(lv, i));
                const hash = this.hash(bufOfLv);
                self.setBuf(lv, 0, toAdd);
                emit(lv, lvFullLengths[lv], toAdd);
                toAdd = hash; // to be added in the upper level
            }
        }
        self.setLength(len + 1);
    }
    toPartialLength(l) {
        return l == 0 ? 0 : (l - 1) % W + 1;
    }
    getLevelLengths(len) {
        return this.getLevelFullLengths(len).map(this.toPartialLength);
    }
    getLevelFullLengths(len) {
        var lengths = [];
        var zeroIfLessThan = 0; // W^0 + W^1 + W^2 ... (1 + 4 + 16 + ...)
        var pow = 1; // pow = W^lv
        for (let lv = 0; lv < H; lv++) {
            zeroIfLessThan += pow;
            const lvLen = (len < zeroIfLessThan) ? 0 : Math.floor((len - zeroIfLessThan) / pow) + 1;
            lengths.push(lvLen); // zero-terminated
            if (lvLen == 0) break;
            pow *= W; // shift
        }
        return lengths;
    }
    // direct access without triggering profiling
    show(len, buf) {
        console.clear();
        var lvLengths = this.getLevelLengths(len);
        for (let lv = H - 1; lv >= 0; lv--) {
            var msg = "lv " + lv + "\t";
            for (let i = 0; i < W; i++) {
                const s = "" + buf[lv][i];
                msg += s.length > 20
                    ? s.substring(0, 17) + "..."
                    : s.padStart(20, " ");
                msg += (i == lvLengths[lv] - 1) ? " ↵  " + "\x1b[90m" : "    "; // ↵
            }
            msg += "\x1b[0m";
            console.log(msg);
        }
        console.log("\n");
        console.log("length: " + len);
        console.log("profiling:", profiler.toString());
        console.log("level lengths     : " + lvLengths + ",...");
        console.log("level full lengths: " + this.getLevelFullLengths(len) + ",...");
        console.log("getPositions(0): ", ht.getPositions(0, len));
        console.log("proof for idx 10: ");
        this.generateMerkleProof(10);
        //this.generateMerkleProof(10).map((l) => console.log(JSON.stringify(l)));
        const t0 = new Date().getTime(); while (new Date().getTime() < t0 + 1000);
    }
    // only for proving
    getPositions(idx, len) {
        if (idx < 0 || idx >= len) return undefined;
        const lvLengths = this.getLevelLengths(len);
        var start = len;
        var pow = 1;
        for (let lv = 0; lv < H; lv++) {
            for (let lvIdx = lvLengths[lv] - 1; lvIdx >= 0; lvIdx--) {
                start -= pow;
                if (start <= idx) {
                    return [lv, lvIdx, start, pow];
                }
            }
            pow *= W;
        }
        return undefined;
    }
    // simulate the circuit
    verify(len, lvHashes, item, lists, indexes) {
        const listHashes = Array.from({length: H}, (v, lv) => Poseidon(lists[lv]));

        const lv0Len = (len == 0) ? 0 : (len - 1) % W + 1;
        const indexMatches = Array(H);
        indexMatches[0] = lists[0][indexes[0]] == item && indexes[0] < lv0Len;
        for (let lv = 1; lv < H; lv++) {
            indexMatches[lv] = lists[lv][indexes[lv]] == listHashes[lv - 1];
        }
        const everyIndexMatches = indexMatches.every((v) => v);

        const someLvEq = listHashes.some((v, lv) => v == lvHashes[lv]);

        return everyIndexMatches && someLvEq;
    }
    generateMerkleProof(idx) {
        const lists = [];
        const listIndexes = [];
        const wrapper = !DEBUG_RANGE ? (v) => BigInt(v) : (v) => v;
        for (let lv = 0; lv < H; lv++) {
            const lvStart = idx - idx % W;
            const list = getEvents(lv, lvStart, lvStart + W);
            if (list[0] === undefined) break;
            lists.push(Array.from({length: W}, (v, i) => wrapper(list[i] || 0)));
            listIndexes.push(idx - lvStart);
            console.log(listIndexes[listIndexes.length - 1], lists[lists.length - 1]);
            if (list[W - 1] === undefined) break;
            idx = Math.floor(idx / W);
        }
        return lists;
    }
}


const htd = new HashTowerData();
const ht = new HashTower();
ht.show(htd.length, htd.buf);
for (let i = 0; i < 10000000; i++) {
    ht.add(htd, i);
    ht.show(htd.length, htd.buf);
}
ht.show(htd.length, htd.buf);
