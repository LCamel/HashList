// keep finding shifted children for each level until we are in the tower
// eventFetcher: (lv, start, len) => [val1, val2 ...]
// idx: the full index of level 0
// returns [C, RL, rootLv]
function buildMerkleProofAndRootLevel(count, W, eventFetcher, idx) {
    if (idx >= count) return [[], [], -1, -1];
    let C = []; // children
    for (let lv = 0, z = 0; true; lv++) {
        z += W ** lv;
        let fl = Math.floor((count - z) / W ** lv) + 1;
        let ll = (fl - 1) % W + 1;
        let start = idx - idx % W;
        if (start == fl - ll) { // we are in the tower now
            let RL = eventFetcher(lv, start, ll);
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

export { buildMerkleProofAndRootLevel, pad0, pad00, padInput };