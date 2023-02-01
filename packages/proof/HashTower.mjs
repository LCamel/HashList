"use strict";
import { poseidon } from "circomlibjs"; // for off-line computing

const profiler = {
    read: 0, write: 0, hash: 0,
    r: function() { this.read++ },
    w: function() { this.write++ },
    h: function() { this.hash++ },
    toString: function() { return `read: ${this.read} write: ${this.write} hash: ${this.hash}` }
};

// 4 * (4^0 + 4^1 + ... 4^11) = 22369620,  4 * (4^0 + 4^1 + ... 4^15) = 5726623060
// 256 * (256^0 + 256^1 + ... 256^3) = 4311810304,  256 * (256^0 + 256^1 + ... 256^4) = 1103823438080
const W = 4;
const H = 12;
const DEBUG_RANGE = false;

const EQ = !DEBUG_RANGE ? ((a, b) => a == b) : ((a, b) => a[0] == b[0] && a[1] == b[1]);
const ZERO = !DEBUG_RANGE ? BigInt(0) : [0, 0];

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
        return !DEBUG_RANGE ? poseidon(arr) : [arr[0][0], Math.max(...arr.map((v) => v[1]))];
    }
    add(self, item) {
        const len = self.getLength(); // use the length before adding the item
        const lvFullLengths = this.getLevelFullLengths(len);
        var toAdd = item; // BigInt or [start, end]
        for (let lv = 0; lv < H; lv++) {
            const lvLen = this.toPartialLength(lvFullLengths[lv]);
            if (lvLen < W) {
                self.setBuf(lv, lvLen, toAdd);
                emit(lv, lvFullLengths[lv], toAdd);
                break;
            } else {
                const lvHash = this.hash(Array.from({length: W}, (v, i) => self.getBuf(lv, i)));
                self.setBuf(lv, 0, toAdd); // add it in the just-emptied level
                emit(lv, lvFullLengths[lv], toAdd);
                toAdd = lvHash;            // to be added in the upper level
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
    }
    // simulate the circuit. only lv0Len and lvHashes are given by the verifier (public)
    // you can claim that childrens[0][indexes[0]] belongs to the original item list
    verify(lv0Len, lvHashes, childrens, indexes, matchLevel) {
        // attackers can't aim at a tailing 0 above lv0
        // so we only check the lv0 case
        const lv0Safe = (matchLevel != 0) || (indexes[0] < lv0Len);

        const chHashes = Array.from({length: H}, (_, lv) => this.hash(childrens[lv]));

        const everyChildMatches = Array.from({length: H}, (_, lv) =>
            lv == 0 ? true : EQ(childrens[lv][indexes[lv]], chHashes[lv - 1]))
            .every((v) => v);

        const matchLevelMatches = EQ(chHashes[matchLevel], lvHashes[matchLevel]);

        console.log("verify: ", { lv0Safe, everyChildMatches, matchLevelMatches });
        console.log("matching level children: ", childrens[matchLevel]);
        return lv0Safe && everyChildMatches && matchLevelMatches;
    }
    // simulate the contract
    loadAndVerify(self, childrens, indexes, matchLevel) {
        // const lv0Len = (len == 0) ? 0 : (len - 1) % W + 1;
        const len = self.getLength();
        if (len == 0) return false;
        const lvLengths = this.getLevelLengths(len);
        const lvHashes = Array(H);
        for (let lv = 0; lv < H; lv++) {
            const levelBuf = Array.from({length: W}, (_, i) => i < lvLengths[lv] ? self.getBuf(lv, i) : ZERO);
            lvHashes[lv] = this.hash(levelBuf);
        }
        return this.verify(lvLengths[0], lvHashes, childrens, indexes, matchLevel);
    }

    // TODO: race condition ?
    generateMerkleProof(idx) {
        const childrens = [];
        const indexes = [];
        for (let lv = 0; lv < H; lv++) {
            const lvStart = idx - idx % W;
            const lvIdx = idx - lvStart;
            const events = getEvents(lv, lvStart, lvStart + W);
            if (events[lvIdx] === undefined) break;
            childrens.push(Array.from({length: W}, (_, i) => i < events.length ? events[i] : ZERO));
            indexes.push(lvIdx);
            if (events[W - 1] === undefined) break;
            idx = Math.floor(idx / W);
        }
        if (childrens.length == 0) return undefined;
        const matchLevel = childrens.length - 1;

        for (let lv = childrens.length; lv < H; lv++) {
            childrens.push(Array.from({length: W}, (_, i) => i == 0 ? this.hash(childrens[lv - 1]) : ZERO));
            indexes.push(0);
        }

        //for (let lv = H - 1; lv >= 0; lv--) {
        //    console.log(lv, "\t", indexes[lv], "\t", childrens[lv]);
        //}

        return [childrens, indexes, matchLevel];
    }
}


const htd = new HashTowerData();
const ht = new HashTower();
ht.show(htd.length, htd.buf);
for (let i = 0; i < 10000000; i++) {
    const item = !DEBUG_RANGE ? BigInt(i) : [i, i];
    ht.add(htd, item);
    ht.show(htd.length, htd.buf);

    console.log("proof for idx 10: ");
    const proof = ht.generateMerkleProof(10);
    if (proof) {
        const OK = ht.loadAndVerify(htd, ...proof);
        console.log("OK: ", OK);

    }

    const t0 = new Date().getTime(); while (new Date().getTime() < t0 + 1000);
}
ht.show(htd.length, htd.buf);
