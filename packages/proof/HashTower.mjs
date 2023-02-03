"use strict";
import { poseidon } from "circomlibjs"; // for off-line computing

// COMMON

const W = 4; // 4 * (4^0 + 4^1 + ... 4^11) = 22369620,  4 * (4^0 + 4^1 + ... 4^15) = 5726623060
const H = 12;
const DEBUG_RANGE = false;
const EQ = !DEBUG_RANGE ? ((a, b) => a == b) : ((ra, rb) => ra[0] == rb[0] && ra[1] == rb[1]);
const ZERO = !DEBUG_RANGE ? BigInt(0) : [0, 0];
const HASH = !DEBUG_RANGE ? poseidon : (ranges) => [ranges[0][0], Math.max(...ranges.map((r) => r[1]))];

function getLevelFullLengths(len) {
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
function toPartialLength(lvLen) {
    return lvLen == 0 ? 0 : (lvLen - 1) % W + 1;
}
function getLevelLengths(len) {
    return getLevelFullLengths(len).map(toPartialLength);
}

// CIRCUIT

// you can claim that childrens[0][indexes[0]] belongs to the original item list
function verify(lv0Len, buf, childrens, indexes, matchLevel) {
    // attackers can't aim at a tailing 0 hash above lv0, so we only check the lv0 case
    const lv0Safe = (matchLevel != 0) || (indexes[0] < lv0Len);

    const chHashes = Array.from({length: H}, (_, lv) => HASH(childrens[lv]));

    const everyChildMatches = Array.from({length: H}, (_, lv) =>
        lv == 0 ? true : EQ(childrens[lv][indexes[lv]], chHashes[lv - 1]))
        .every((v) => v);

    const matchLevelMatches = EQ(childrens[matchLevel][indexes[matchLevel]], buf[matchLevel][indexes[matchLevel]]);

    console.log("verify: ", { lv0Safe, everyChildMatches, matchLevelMatches });
    console.log("matching level children: ", childrens[matchLevel]);
    return lv0Safe && everyChildMatches && matchLevelMatches;
}

// CONTRACT

const events = Array.from({length: H}, () => []);
function emit(lv, lvIdx, val) {
    events[lv][lvIdx] = val;
}
function getEvents(lv, start, end) {
    return events[lv].slice(start, end); // end exclusive
}

const profiler = {
    read: 0, write: 0, hash: 0,
    r: function() { this.read++ },
    w: function() { this.write++ },
    h: function() { this.hash++ },
    toString: function() { return `read: ${this.read} write: ${this.write} hash: ${this.hash}` }
};

class HashTowerData { // struct HashTowerData
    constructor() {
        this.length = 0;
        this.buf = Array.from({length: H}, () => Array(W));
    }
    getLength()        { profiler.r(); return this.length; }
    setLength(l)       { profiler.w(); this.length = l; }
    getBuf(lv, idx)    { profiler.r(); return this.buf[lv][idx]; }
    setBuf(lv, idx, v) { profiler.w(); this.buf[lv][idx] = v; }
}

class HashTower { // library HashTower
    add(self, item) {                 // item is BigInt (or range for debugging)
        const len = self.getLength(); // the length before adding the item
        const lvFullLengths = getLevelFullLengths(len);
        var toAdd = item;
        for (let lv = 0; lv < H; lv++) {
            const lvLen = toPartialLength(lvFullLengths[lv]);
            if (lvLen < W) {
                self.setBuf(lv, lvLen, toAdd);
                emit(lv, lvFullLengths[lv], toAdd);
                break;
            } else {
                const lvHash = HASH(Array.from({length: W}, (_, i) => self.getBuf(lv, i))); profiler.h();
                self.setBuf(lv, 0, toAdd); // add it in the just-emptied level
                emit(lv, lvFullLengths[lv], toAdd);
                toAdd = lvHash;            // to be added in the upper level
            }
        }
        self.setLength(len + 1);
    }
    loadAndVerify(self, childrens, indexes, matchLevel) {
        const len = self.getLength();
        if (len == 0) return false;
        const lvLengths = getLevelLengths(len);
        const buf = Array(H);
        for (let lv = 0; lv < H; lv++) {
            buf[lv] = Array.from({length: W}, (_, i) => i < lvLengths[lv] ? self.getBuf(lv, i) : ZERO);
        }
        return verify(lvLengths[0], buf, childrens, indexes, matchLevel);
    }
}

// PROVER

// TODO: race condition ?
function generateMerkleProofFromEvents(itemIdx) {
    const childrens = [];
    const indexes = [];
    var lvFullIdx = itemIdx;
    for (let lv = 0; lv < H; lv++) {
        const chIdx = lvFullIdx % W;
        const chStart = lvFullIdx - chIdx;
        const events = getEvents(lv, chStart, chStart + W);
        if (events[chIdx] === undefined) break;
        childrens.push(Array.from({length: W}, (_, i) => i < events.length ? events[i] : ZERO));
        indexes.push(chIdx);
        if (events[W - 1] === undefined) break;
        lvFullIdx = Math.floor(lvFullIdx / W);
    }
    if (childrens.length == 0) return undefined;
    const matchLevel = childrens.length - 1;

    for (let lv = childrens.length; lv < H; lv++) {
        childrens.push(Array.from({length: W}, (_, i) => i == 0 ? HASH(childrens[lv - 1]) : ZERO));
        indexes.push(0);
    }
    return [childrens, indexes, matchLevel];
}

// DEMO

function show(len, buf) { // direct access without triggering profiling
    var lvLengths = getLevelLengths(len);
    for (let lv = H - 1; lv >= 0; lv--) {
        var msg = "lv " + lv + "\t";
        for (let i = 0; i < W; i++) {
            const s = String(buf[lv][i] ?? '_');
            msg += s.length > 20 ? s.substring(0, 17) + "..." : s.padStart(20, " ");
            msg += (i == lvLengths[lv] - 1) ? " ↵  " + "\x1b[90m" : "    "; // ↵
        }
        msg += "\x1b[0m";
        console.log(msg);
    }
    console.log("\n");
    console.log("length: " + len);
    console.log("profiling:", profiler.toString());
    console.log("level lengths     : " + lvLengths + ",...");
    console.log("level full lengths: " + getLevelFullLengths(len) + ",...");
}

const htd = new HashTowerData();
const ht = new HashTower();
console.clear();
show(htd.length, htd.buf);
for (let i = 0; i < 1000000; i++) {
    await new Promise(r => setTimeout(r, 1000));
    console.clear();

    const item = !DEBUG_RANGE ? BigInt(i) : [i, i];
    ht.add(htd, item);
    show(htd.length, htd.buf);
    console.log("proof for idx 10: ");
    const proof = generateMerkleProofFromEvents(10);
    if (proof) {
        console.log("loadAndVerify: ", ht.loadAndVerify(htd, ...proof));
    }
}

// TODO: hash / read profiling
