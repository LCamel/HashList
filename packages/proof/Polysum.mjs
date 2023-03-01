import { poseidon } from "circomlibjs";
import { CoreTower, buildL, buildMerkleProof, assert, assertEq } from "./Correctness.mjs";
const FIELD_SIZE = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

function PolysumTower(W, P1, R) {
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


const R = 2n;
function P1(v) {
    //return (BigInt(v) + 123n) % FIELD_SIZE;
    return poseidon([v]);
}

// If the inputs are considered "safe":
//   vs[0] * R^1
// + vs[1] * R^2
// + vs[2] * R^3
// + vs[3] * R^4
function polysum(vs) {
    return vs.reduce((acc, v, i) => acc + v * R ** BigInt(i + 1), 0n) % FIELD_SIZE;
}
// If the inputs are considered "non-safe":
//   P1(vs[0]) * R^1
// + P1(vs[1]) * R^2
// + P1(vs[2]) * R^3
// + P1(vs[3]) * R^4
function digestByPolysumOfHashValues(vs) {
    return polysum(vs.map((v) => P1([v])));
}

const IS_MAIN = true;
if (IS_MAIN) {
    BigInt.prototype.toJSON = function() { return this.toString() } // for JSON.stringify in assertEq

    const W = 4;
    const N = 150;


    let t = CoreTower(W, digestByPolysumOfHashValues);
    let pt = PolysumTower(W, P1, R);
    for (let i = 0n; i < N; i++) {
        t.add(i);
        pt.add(i);
        assert(pt.D.length == t.L.length, "bad pt.D.length");
        assertEq(pt.D, t.L.map(t.digest), "bad pt.D");
        assert(pt.dd == polysum(pt.D), "bad pt.dd");
    }


    var pad = (arr, len, val) => arr.concat(Array(len - arr.length).fill(val));

    let H = 16;
    let L = buildL(pt.count, W, pt.E);
    L = pad(L, H, []);
    let len = L.map((l) => l.length);
    L = L.map((l) => pad(l, W, 0n));
    let [C, idx] = buildMerkleProof(pt.count, W, pt.E, 10);
    let rootLevel = C.length - 1;
    let rootIdx = idx.at(-1);
    C = pad(C, H, []).map((c) => pad(c, W, 0n));
    idx = pad(idx, H, 0n);

    var INPUT = { dd: pt.dd, L, len, rootLevel, rootIdx, C, idx };
    console.log(JSON.stringify(INPUT));
}


