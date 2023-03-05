function Tower(W, digest) {
    let L = []; // levels[][]
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


// Add shifted levels S.  Keep L the same.
function ShiftTower(W, digest) {
    let S = []; // shifted levels (events)
    let L = []; // levels[][]
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

// eventFetcher: (lv, start, len) => [val1, val2 ...]
function buildL(count, W, eventFetcher) {
    let [FL, LL] = getLengths(count, W);
    return FL.map((fl, lv) => eventFetcher(lv, fl - LL[lv], LL[lv]));
}

// keep finding shifted children for each level until we are in the tower
function buildMerkleProofAndLocateRoot(count, W, E, idx) {
    let C = []; // children
    let CI = []; // children index
    if (idx >= count) return [C, CI, -1, -1];

    let [FL, LL] = getLengths(count, W);
    for (let lv = 0; true; lv++) {
        let start = idx - idx % W;
        if (start == FL[lv] - LL[lv]) { // we are in the tower now
            // To make the intention more clear,
            // here we put the root at position 0 and return a separate rootIdxInL .
            //
            // Another choice is putting the root at idx and return it in CI[-1] .
            // This might be more "beautiful", since the root is on its "course".
            // However, it is not necessary.
            C.push(E[lv].slice(idx, idx + 1)); // fetch the single the root
            CI.push(0);
            return [C, CI, lv, idx - start]; // rootLevel, rootIdxInL
        } else {
            C.push(E[lv].slice(start, start + W));
            CI.push(idx - start);
        }
        idx = Math.floor(idx / W);
    }
}

function verifyMerkleProof(C, CI, incDigest, eq) {
    //const eq = (v1, v2) => JSON.stringify(v1) == JSON.stringify(v2);
    for (let lv = 1; lv < C.length; lv++) {
        if (!eq(C[lv][CI[lv]], C[lv - 1].reduce(incDigest, undefined))) return false;
    }
    return true;
}


function PolysumTower(W, P1, R, FIELD_SIZE) {
    let count = 0;
    let D = []; // level digests
    let dd = 0n; // digest of digests
    let E = []; // events (S + L) for each level
    function add(toAdd) {
        let dd1 = dd;
        for (let lv = 0, z = 0; true; lv++) {
            // inlined length computations
            z += W ** lv;
            let fl = count < z ? 0 : Math.floor((count - z) / W ** lv) + 1;
            let ll = fl == 0 ? 0 : (fl - 1) % W + 1;

            if (ll == 0) E[lv] = [];
            E[lv][fl] = toAdd;    // emit event
            if (ll == 0) {        // new level
                let d1 = (P1(toAdd) * R) % FIELD_SIZE;
                dd1 = (dd1 + d1 * R ** BigInt(lv + 1)) % FIELD_SIZE;
                D[lv] = d1;
                break;
            } else if (ll < W) {  // not full
                let d0 = D[lv];
                let d1 = (d0 + P1(toAdd) * R ** BigInt(ll + 1)) % FIELD_SIZE;
                dd1 = (dd1 + (d1 + FIELD_SIZE - d0) * R ** BigInt(lv + 1)) % FIELD_SIZE;
                D[lv] = d1;
                break;
            } else {              // full
                let d0 = D[lv];
                let d1 = (P1(toAdd) * R) % FIELD_SIZE;
                dd1 = (dd1 + (d1 + FIELD_SIZE - d0) * R ** BigInt(lv + 1)) % FIELD_SIZE;
                D[lv] = d1;
                toAdd = d0;
            }
        }
        dd = dd1;
        count++;
    }
    return { W, D, E, add, get count() { return count }, get dd() { return dd } };
}


export { Tower, digestOfRange, ShiftTower, getLengths, incDigestOfRange, DigestTower, buildL, buildMerkleProofAndLocateRoot, verifyMerkleProof, PolysumTower };
