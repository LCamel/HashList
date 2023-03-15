// Given a single number "count", we can reconstruct the "shape"
// of levels and shifted levels.
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

// eventFetcher: (lv, start, len) => [val1, val2 ...]
function buildL(count, W, eventFetcher) {
    let [FL, LL] = getLengths(count, W);
    return FL.map((fl, lv) => eventFetcher(lv, fl - LL[lv], LL[lv]));
}

// keep finding shifted children for each level until we are in the tower
// eventFetcher: (lv, start, len) => [val1, val2 ...]
//
// returns [C, CI, rootLevel, rootIdxInL]
//
// To make the intention clear,
// here we put the root at position 0 and return a separate rootIdxInL .
//
// Another choice is putting the root at idx and return it in CI[-1] .
// This might be more "beautiful", since the root is on its "course".
// However, it is not necessary.
function buildMerkleProofAndLocateRoot(count, W, eventFetcher, idx) {
    let C = []; // children
    let CI = []; // children index
    if (idx >= count) return [C, CI, -1, -1];

    let [FL, LL] = getLengths(count, W);
    for (let lv = 0; true; lv++) {
        let start = idx - idx % W;
        if (start == FL[lv] - LL[lv]) { // we are in the tower now
            C.push(eventFetcher(lv, idx, 1)); // fetch the single the root
            CI.push(0);
            return [C, CI, lv, idx - start]; // rootLevel, rootIdxInL
        } else {
            C.push(eventFetcher(lv, start, W));
            CI.push(idx - start);
        }
        idx = Math.floor(idx / W);
    }
}

// nondestructive, copying methods
const pad = (arr, len, val) => arr.concat(Array(len - arr.length).fill(val));
const pad0 = (arr, len) => pad(arr, len, 0n);
const pad00 = (arr2D, h, w) => pad(arr2D, h, []).map(a => pad0(a, w));

function padInput(W, H, count, dd, L, C, CI, rootLevel, rootIdxInL) {
    const LL = pad0(L.map((l) => l.length), H);
    const h = L.length;
    L = pad00(L, H, W);
    C = pad00(C, H, W);
    CI = pad0(CI, H);
    const leaf = C[0][CI[0]];
    return { count, dd, L, LL, h, rootLevel, rootIdxInL, C, CI, leaf };
}

export { getLengths, buildL, buildMerkleProofAndLocateRoot, pad0, pad00, padInput };