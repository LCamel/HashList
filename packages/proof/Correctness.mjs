"use strict";
function Tower(W, digest) {
    let S = []; // shifted levels
    let L = []; // levels
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

function digestOfRange(vs) {
    var arr = vs.flat();
    return [ arr.at(0), arr.at(-1) ];
}

const N = 150;

{
    let t = Tower(4, digestOfRange);
    for (let i = 0; i < N; i++) {
        t.add(i);

        console.log("\n");
        for (var lv = t.L.length - 1; lv >= 0; lv--) {
            console.log(t.S[lv].join(" ").padStart(70).slice(-70), "#",
                t.L[lv].map(v => v.toString().padStart(7)).join(" "));
        }
    }
}

const assert = (v, msg) => { if (!v) throw msg };
const assertEq = (v1, v2, msg) => assert(JSON.stringify(v1) == JSON.stringify(v2), msg);

// given a single number "count", can we reconstruct the shape of L ?
function getFullLengths(count, W) {
    const FL = [];
    for (let lv = 0, z = 0; true; lv++) {
        z += W ** lv;
        if (count < z) break;
        FL.push(Math.floor((count - z) / W ** lv) + 1);
    }
    return FL;
}

{
    let t = Tower(4, digestOfRange);
    for (let i = 0; i < N; i++) {
        t.add(i);

        let FL = getFullLengths(i + 1, t.W);
        assert(FL.length == t.L.length, "bad FL.length");
        for (let lv = 0; lv < t.L.length; lv++) {
            let fl = FL[lv];
            assert(fl == t.S[lv].length + t.L[lv].length, "bad fl");

            let ll = (fl - 1) % t.W + 1;
            assert(ll == t.L[lv].length, "bad ll");

            let start = fl - ll;
            assert(start * t.W ** lv == t.L[lv].flat()[0], "bad start");
        }
    }
}

// we are going to replace levels L[][] with digests D[]

function incDigestOfRange(orig, v, i) {
    var arr = i == 0 ? [v].flat() : [orig, v].flat();
    return [arr.at(0), arr.at(-1)];
}
function DigestTower(W, incDigest) {
    let count = 0;
    let D = []; // digests
    let E = []; // events
    function add(toAdd) {
        for (let lv = 0, z = 0; true; lv++) {
            z += W ** lv;
            let fl = count < z ? 0 : Math.floor((count - z) / W ** lv) + 1;
            let ll = fl == 0 ? 0 : (fl - 1) % W + 1;

            if (ll == 0) E[lv] = [];
            E[lv][fl] = toAdd;
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
    let FL = getFullLengths(count, W);
    return FL.map((fl, lv) => {
        let ll = fl == 0 ? 0 : (fl - 1) % W + 1;
        return E[lv].slice(fl - ll, fl - ll + W);
    });
}
function buildProof(count, W, E, idx) {
    let C = [];
    let CI = [];
    if (idx >= count) return [C, CI];
    let FL = getFullLengths(count, W);
    for (let lv = 0; true; lv++) {
        let fl = FL[lv];
        let ll = fl == 0 ? 0 : (fl - 1) % W + 1;
        let start = fl - ll;
        if (idx >= start && idx < fl) {
            C.push(E[lv].slice(start, start + ll));
            CI.push(idx - start);
            break;
        } else {
            var s = idx - idx % W;
            C.push(E[lv].slice(s, s + W));
            CI.push(idx - s);
        }
        idx = Math.floor(idx / W);
    }
    return [C, CI];
}

function verifyProof(C, CI, root, incDigest) {
    for (let lv = 1; lv < C.length; lv++) {
        assertEq(C[lv][CI[lv]], C[lv - 1].reduce(incDigest, undefined), "inconsistent proof");
    }
    assertEq(C.at(-1)[CI.at(-1)], root, "root mismatch");
}

{
    // the digest version should match with the original version
    let t = Tower(4, digestOfRange);
    let dt = DigestTower(4, incDigestOfRange);
    for (let i = 0; i < N; i++) {
        t.add(i);
        dt.add(i);

        assert(dt.D.length == t.L.length, "bad dt.D.length");
        for (let lv = 0; lv < t.L.length; lv++) {
            assertEq(dt.D[lv], t.L[lv].reduce(incDigestOfRange, undefined), "bad dt.D[lv]");
        }

        // let's reconstruct L from E by count
        assertEq(buildL(i + 1, dt.W, dt.E), t.L, "bad buildL");

        // and build a merkle proof
        let [C, CI] = buildProof(i + 1, dt.W, dt.E, 101);

        // the proof is self-consistent and match with a in-tower root
        if (C.length) {
            let root = t.L[CI.length - 1][CI.at(-1)];
            verifyProof(C, CI, root, incDigestOfRange);
        }
    }
}
