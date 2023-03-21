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
// only for debugging
function buildL(count, W, eventFetcher) {
    let [FL, LL] = getLengths(count, W);
    return FL.map((fl, lv) => eventFetcher(lv, fl - LL[lv], LL[lv]));
}

// keep finding shifted children for each level until we are in the tower
// eventFetcher: (lv, start, len) => [val1, val2 ...]
// idx: the full index of level 0
// returns [C, RL, rootLv]
function buildMerkleProofAndRootLevel(count, W, eventFetcher, idx) {
    if (idx >= count) return [[], [], -1, -1];
    let [FL, LL] = getLengths(count, W);
    let C = []; // children
    for (let lv = 0; true; lv++) {
        let start = idx - idx % W;
        if (start == FL[lv] - LL[lv]) { // we are in the tower now
            let RL = eventFetcher(lv, start, LL[lv]);
            return [C, RL, lv];
        } else {
            C.push(eventFetcher(lv, start, W));
        }
        idx = Math.floor(idx / W);
    }
}

// nondestructive, copying methods
const pad = (arr, len, val) => arr.concat(Array(len - arr.length).fill(val));
const pad0 = (arr, len) => pad(arr, len, 0n);
const pad00 = (arr2D, h, w) => pad(arr2D, h, []).map(a => pad0(a, w));

function padInput(count, dd, D, rootLv, RL, C, leaf, H, W) {
    return { count, dd, D:pad0(D, H), rootLv, RL:pad0(RL, W), C:pad00(C, H - 1, W), leaf };
}

export { getLengths, buildL, buildMerkleProofAndRootLevel, pad0, pad00, padInput };