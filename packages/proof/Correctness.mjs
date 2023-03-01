"use strict";

function CoreTower(W, digest) {
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

const IS_MAIN = false;
const N = 150;

if (IS_MAIN)
{
    console.log("==== CoreTower ====");
    let t = CoreTower(4, digestOfRange);
    for (let i = 0; i < N; i++) {
        t.add(i);
        console.log("====");
        for (let lv = t.L.length - 1; lv >= 0; lv--) {
            console.log(t.L[lv].join('\t'));
        }
    }
}

// Add shifted levels S.  Keep L the same.
function Tower(W, digest) {
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

if (IS_MAIN)
{
    console.log("==== Tower ====");
    const fmt = (v, l) => ("" + v).padStart(l).slice(-l);
    const fmtl = (vs, l) => vs.map(v => fmt(v, l)).join(" ");
    let t = Tower(4, digestOfRange);
    for (let i = 0; i < N; i++) {
        t.add(i);
        console.log("\n");
        for (var lv = t.L.length - 1; lv >= 0; lv--) {
            console.log(fmt(fmtl(t.S[lv], 7), 70), "#", fmtl(t.L[lv], 7));
        }
    }
}

const assert = (v, msg) => { if (!v) throw msg };
const assertEq = (v1, v2, msg) => assert(JSON.stringify(v1) == JSON.stringify(v2), msg);

// Given a single number "count", can we reconstruct the "shape" of L and S ?
function getLengths(count, W) {
    let FL = []; // full level lengths (S + L)
    let LL = []; // level lengths (L)
    for (let lv = 0, z = 0; true; lv++) {
        z += W ** lv;
        if (count < z) break;
        let fl = Math.floor((count - z) / W ** lv) + 1
        FL.push(fl);
        LL.push((fl - 1) % W + 1);
    }
    return [FL, LL];
}

if (IS_MAIN)
{
    // check getLengths()
    let t = Tower(4, digestOfRange);
    for (let i = 0; i < N; i++) {
        t.add(i);
        let count = i + 1;
        let [FL, LL] = getLengths(count, t.W);
        assert(FL.length == t.L.length, "bad FL.length");
        assert(LL.length == t.L.length, "bad LL.length");
        for (let lv = 0; lv < t.L.length; lv++) {
            assert(FL[lv] == t.S[lv].length + t.L[lv].length, "bad fl");
            assert(LL[lv] ==                  t.L[lv].length, "bad ll");
            assert((FL[lv] - LL[lv]) * t.W ** lv == t.L[lv].flat()[0], "bad start");
        }
    }
}

// Since we can derive the "shape" of L and S from count,
// we can use events to store them and restore them later.
// L is summarized and fixed by the incrementally-built digests D[].
// A prover must collect the right events to pass the digest check.
function incDigestOfRange(orig, v, i) {
    var arr = i == 0 ? [v].flat() : [orig, v].flat();
    return [arr.at(0), arr.at(-1)];
}
function DigestTower(W, incDigest) {
    let count = 0;
    let D = []; // level digests
    let E = []; // events (S + L) for each level
    function add(toAdd) {
        for (let lv = 0, z = 0; true; lv++) {
            // inlined length computations
            z += W ** lv;
            let fl = count < z ? 0 : Math.floor((count - z) / W ** lv) + 1;
            let ll = fl == 0 ? 0 : (fl - 1) % W + 1;

            if (ll == 0) E[lv] = [];
            E[lv][fl] = toAdd;    // emit event
            if (ll == 0) {        // new level
                D[lv] = incDigest(undefined, toAdd, 0);
                break;
            } else if (ll < W) {  // not full
                D[lv] = incDigest(D[lv], toAdd, ll);
                break;
            } else {              // full
                let tmp = D[lv];
                D[lv] = incDigest(undefined, toAdd, 0);
                toAdd = tmp;
            }
        }
        count++;
    }
    return { W, incDigest, D, E, add };
}

function buildL(count, W, E) {
    let [FL, LL] = getLengths(count, W);
    return FL.map((fl, lv) => {
        let start = fl - LL[lv];
        return E[lv].slice(start, start + W); // less than W is OK
    });
}
// keep finding shifted childrens until we enter the tower
function buildMerkleProof(count, W, E, idx) {
    let C = []; // children
    let CI = []; // children index
    if (idx >= count) return [C, CI];
    let [FL, LL] = getLengths(count, W);
    for (let lv = 0; true; lv++) {
        let start = idx - idx % W;
        C.push(E[lv].slice(start, start + W)); // less than W is OK
        CI.push(idx - start);
        if (start == FL[lv] - LL[lv]) break; // we are in the tower now
        idx = Math.floor(idx / W);
    }
    return [C, CI];
}

function verifyMerkleProof(C, CI, root, incDigest) {
    for (let lv = 1; lv < C.length; lv++) {
        assertEq(C[lv][CI[lv]], C[lv - 1].reduce(incDigest, undefined), "inconsistent proof");
    }
    assertEq(C.at(-1)[CI.at(-1)], root, "root mismatch");
}

if (IS_MAIN)
{
    // the digest version should match with the original version
    let t = Tower(4, digestOfRange);
    let dt = DigestTower(4, incDigestOfRange);
    for (let i = 0; i < N; i++) {
        t.add(i);
        dt.add(i);

        // verify D
        assert(dt.D.length == t.L.length, "bad dt.D.length");
        for (let lv = 0; lv < t.L.length; lv++) {
            assertEq(dt.D[lv], t.L[lv].reduce(dt.incDigest, undefined), "bad dt.D[lv]");
        }

        // reconstruct L from E by "count"
        let count = i + 1;
        let L = buildL(count, dt.W, dt.E);
        assertEq(L, t.L, "bad buildL");

        // all index [0 .. i] should be provable
        for (let j = 0; j <= i; j++) {
            // build a merkle proof
            let [C, CI] = buildMerkleProof(count, dt.W, dt.E, j);

            // the proof is self-consistent and match with an in-tower root
            let root = L[CI.length - 1][CI.at(-1)];
            verifyMerkleProof(C, CI, root, dt.incDigest);
        }

        // index i + 1 should not be provable
        let [C, CI] = buildMerkleProof(count, dt.W, dt.E, i + 1);
        assert(C.length == 0, "bad C.length");
        assert(CI.length == 0, "bad CI.length");
    }
}

export { CoreTower, buildL, buildMerkleProof, assert, assertEq };