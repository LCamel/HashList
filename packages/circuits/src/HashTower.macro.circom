pragma circom 2.1.0;

include "circomlib/poseidon.circom";
include "circomlib/multiplexer.circom";
include "circomlib/comparators.circom";
include "circomlib/gates.circom";

template PickOne(N) {
    signal input in[N];
    signal input sel;
    signal output out;

    component mux = Multiplexer(1, N);
    for (var i = 0; i < N; i++) { mux.inp[i][0] <== in[i]; }
    mux.sel <== sel;
    out <== mux.out[0];
}

template PickOneFromEachRow(ROWS, COLS) {
    signal input in[ROWS][COLS];
    signal input whichCol[ROWS];
    signal output out[ROWS];

    component pickOne[ROWS];
    for (var r = 0; r < ROWS; r++) {
        pickOne[r] = PickOne(COLS);
        @COLS pickOne[r].in@* <== in[r]@*;
        pickOne[r].sel <== whichCol[r];
        out[r] <== pickOne[r].out;
    }
}

template HashTower(H, W) {
    assert(W <= 256);

    signal input lv0Len;
    signal input levels[H][W];

    signal input childrens[H][W];
    signal input indexes[H];
    signal input matchLevel;

    signal output out;


    // JS: const lv0Safe = (matchLevel != 0) || (indexes[0] < lv0Len);
    component matchLevelIsZero = IsZero();
    matchLevelIsZero.in <== matchLevel;
    component idx0LtLen0 = LessThan(8); // 2^8 = 256 for each level
    idx0LtLen0.in[0] <== indexes[0]; // TODO: warning
    idx0LtLen0.in[1] <== lv0Len;
    component lv0Safe = OR();
    lv0Safe.a <== (1 - matchLevelIsZero.out);
    lv0Safe.b <== idx0LtLen0.out;
    // lv0Safe.out;
    lv0Safe.out === 1;


    component chHashes[H];
    for (var lv = 0; lv < H; lv++) {
        chHashes[lv] = Poseidon(W);
        @W chHashes[lv].inputs@* <== childrens[lv]@*;
    }
    // chHashes[lv].out

    component pickOneFromEachChildren = PickOneFromEachRow(H, W);
    @H@@W pickOneFromEachChildren.in@* <== childrens@*;
    @H pickOneFromEachChildren.whichCol@* <== indexes@*;
    // pickOneFromEachChildren.out[]

    // JS: const isMerkleProof = childrens.every((children, lv) =>
    //         lv == 0 ? true : EQ(children[indexes[lv]], chHashes[lv - 1]));
    signal isMerkleProof[H];
    component chMatchHashes[H];
    isMerkleProof[0] <== 1;
    for (var lv = 1; lv < H; lv++) {
        chMatchHashes[lv] = IsZero();
        chMatchHashes[lv].in <== pickOneFromEachChildren.out[lv] - chHashes[lv - 1].out;
        isMerkleProof[lv] <== isMerkleProof[lv - 1] * chMatchHashes[lv].out;
    }
    // isMerkleProof[H - 1]


    // JS: const rootMatches = EQ(childrens[matchLevel][indexes[matchLevel]],
    //                               levels[matchLevel][indexes[matchLevel]]);
    component pickOneFromEachLevel = PickOneFromEachRow(H, W);
    @H@@W pickOneFromEachLevel.in@* <== levels@*;
    @H pickOneFromEachLevel.whichCol@* <== indexes@*;

    component theChild = PickOne(H);
    @H theChild.in@* <== pickOneFromEachChildren.out@*;
    theChild.sel <== matchLevel;
    component theRoot = PickOne(H);
    @H theRoot.in@* <== pickOneFromEachLevel.out@*;
    theRoot.sel <== matchLevel;

    theChild.out === theRoot.out;


    // JS: return lv0Safe && isMerkleProof && rootMatches;
    out <== isMerkleProof[H - 1];
}

component main { public [ lv0Len, levels ] } = HashTower(2, 2);

// > var { poseidon } = require("circomlibjs");
// > poseidon([1, 2])
// 7853200120776062878684798364095072458815029376092732009249414926327459813530n
// > poseidon([3, 4])
// 14763215145315200506921711489642608356394854266165572616578112107564877678998n

// targeting "4" in lv0
/* INPUTGOOD = {
"lv0Len": 2,
"levels": [
    [3, 4],
    ["7853200120776062878684798364095072458815029376092732009249414926327459813530", 0]
],
"childrens": [
    [3, 4],
    ["14763215145315200506921711489642608356394854266165572616578112107564877678998", 0]
],
"indexes": [
    1,
    0
],
"matchLevel": 0
} */

// targeting "4" in lv0, but intentionally set lv0Len = 1 to make it fail
/* INPUTBAD = {
"lv0Len": 1,
"levels": [
    [3, 4],
    ["7853200120776062878684798364095072458815029376092732009249414926327459813530", 0]
],
"childrens": [
    [3, 4],
    ["14763215145315200506921711489642608356394854266165572616578112107564877678998", 0]
],
"indexes": [
    1,
    0
],
"matchLevel": 0
} */


// targeting "hash(1, 2)" in lv1
/* INPUTGOOD = {
"lv0Len": 1,
"levels": [
    [3, 4],
    ["7853200120776062878684798364095072458815029376092732009249414926327459813530", 0]
],
"childrens": [
    [1, 2],
    ["7853200120776062878684798364095072458815029376092732009249414926327459813530", 0]
],
"indexes": [
    1,
    0
],
"matchLevel": 1
} */

// targeting "hash(3, 4)" in lv1
/* INPUT = {
"lv0Len": 1,
"levels": [
    [5, 6],
    ["7853200120776062878684798364095072458815029376092732009249414926327459813530", "14763215145315200506921711489642608356394854266165572616578112107564877678998"]
],
"childrens": [
    [3, 4],
    ["42424242", "14763215145315200506921711489642608356394854266165572616578112107564877678998"]
],
"indexes": [
    1,
    1
],
"matchLevel": 1
} */
