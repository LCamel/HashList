pragma circom 2.1.0;

include "circomlib/poseidon.circom";
include "circomlib/multiplexer.circom";
include "circomlib/comparators.circom";

// choose HASH_INPUT_COUNT = 4 to minimize the average gas cost
template HashList(HASH_COUNT, HASH_INPUT_COUNT) {
    assert(HASH_INPUT_COUNT >= 2);
    var MAX_INPUT_COUNT = 1 + HASH_COUNT * (HASH_INPUT_COUNT - 1);
    signal input inputs[MAX_INPUT_COUNT]; // the user should fill the trailing slots
    signal input outputHashSelector;
    signal output out;

    component hashes[HASH_COUNT];
    component outputMux = Multiplexer(1, HASH_COUNT);

    for (var h = 0; h < HASH_COUNT; h++) {
        hashes[h] = Poseidon(HASH_INPUT_COUNT);

        hashes[h].inputs[0] <== (h == 0) ? inputs[0] : hashes[h - 1].out;

        for (var hi = 1; hi < HASH_INPUT_COUNT; hi++) {
            hashes[h].inputs[hi] <== inputs[h * (HASH_INPUT_COUNT - 1) + hi];
        }

        outputMux.inp[h][0] <== hashes[h].out;
    }
    outputMux.sel <== outputHashSelector;
    out <== outputMux.out[0];
}

//component main = HashList(6, 4);
/* INPUT = {
"inputs":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],
"outputHashSelector": 5
} */

/*
4050345352754260300667252706570081029004026400044882557845061748628670512780
3510676252706075353710622977923470633769850687307321002334228238274215327815
12957194406842525945768305445182056040197948786420924760634360581544661385269
3899362167543446351604218567019375731145501307449189070368280709184579142647
14691292887738792867409653573323786688208167038640991871286126213897153851568
748902435937864876241972501117205701882452989848378085868814553847075624288
*/

// for HASH_INPUT_COUNT = 4:
// length:              0 1 2 3 4 5 6 7 8 9 10
// outputHashSelector:  0 0 0 0 0 1 1 1 2 2 2
// if (length <= HASH_INPUT_COUNT) { length } else { (length - 2) \ (HASH_INPUT_COUNT - 1)}
// or
// length < 2 ? 0 : (length - 2) \ (HASH_INPUT_COUNT - 1)
/*
template LengthToOutputHashSelector(HASH_INPUT_COUNT) {
    assert(HASH_INPUT_COUNT >= 2);
    signal input length;
    signal output outputHashSelector;

    assert(length < (1 << 20)); // restrict length to reduce circuit complexity
                                // 1 << 20 = 2 ^ 20 = 1048576
    component lt = LessEqThan(20);
    lt.in[0] <== length;
    lt.in[1] <== HASH_INPUT_COUNT;

    // It seems that "\" cause the proof fail.
    outputHashSelector <== (1 - lt.out) * (length - 2) \ (HASH_INPUT_COUNT - 1);
}
*/

template ForceTrailingZero(N) {
    assert(N < (1 << 20));    // restrict N to reduce circuit complexity
                              // 1 << 20 = 2 ^ 20 = 1048576
    signal input inputs[N];
    signal input start;

    component lt[N];
    for (var i = 0; i < N; i++) {
        lt[i] = LessThan(20); // assuming that N < 2^20
        lt[i].in[0] <== i;
        lt[i].in[1] <== start;
        inputs[i] === lt[i].out * inputs[i];
    }
}

// both "length" and "outputHashSelector" shall be specified by the verifier!
// choose HASH_INPUT_COUNT = 4 to minimize the average gas cost
template HashListWithTrailingZero(HASH_COUNT, HASH_INPUT_COUNT) {
    var MAX_INPUT_COUNT = 1 + HASH_COUNT * (HASH_INPUT_COUNT - 1);
    signal input inputs[MAX_INPUT_COUNT];
    signal input length;
    signal input outputHashSelector; // TODO: derive from length
    signal input buf[HASH_INPUT_COUNT];
    signal output diff; // should be zero

    // TODO: derive from length
    assert((length == 0 && outputHashSelector == 0)
        || (length == 1 && outputHashSelector == 0)
        || outputHashSelector == (length - 2) \ (HASH_INPUT_COUNT - 1));

    component forceTrailingZero = ForceTrailingZero(MAX_INPUT_COUNT);
    for (var i = 0; i < MAX_INPUT_COUNT; i++) {
        forceTrailingZero.inputs[i] <== inputs[i];
    }
    forceTrailingZero.start <== length;

    component hashList = HashList(HASH_COUNT, HASH_INPUT_COUNT);
    for (var i = 0; i < MAX_INPUT_COUNT; i++) {
        hashList.inputs[i] <== inputs[i];
    }
    hashList.outputHashSelector <== outputHashSelector;

    component h = Poseidon(HASH_INPUT_COUNT);
    for (var i = 0; i < HASH_INPUT_COUNT; i++) {
        h.inputs[i] <== buf[i];
    }

    diff <== hashList.out - h.out;
}
    // "[ERROR] snarkJS: Invalid proof"
    //component lengthToOutputHashSelector = LengthToOutputHashSelector(HASH_INPUT_COUNT);
    //lengthToOutputHashSelector.length <== length;
    //hashList.outputHashSelector <== lengthToOutputHashSelector.outputHashSelector;

    // "[ERROR] snarkJS: Invalid proof"
    //component lt2 = LessThan(20);
    //lt2.in[0] <== length;
    //lt2.in[1] <== 2;
    //hashList.outputHashSelector <== (1 - lt2.out) * ((length - 2) \ (HASH_INPUT_COUNT - 1));

    // [ERROR] snarkJS: Error: Scalar size does not match
    // if we just compare hashList.out === h.out without output it

//component main = HashListWithTrailingZero(6, 4);
/*
INPUT=
{
"inputs":[0,1,2,3,4,5,6,7,0,0,0,0,0,0,0,0,0,0,0],
"length": "8"
}
*/

// for input count = 2
// level 0 has 1 hash, total 2 inputs
// level 1 has 2 hash, total 4 inputs
// level 2 has 4 hash, total 8 inputs
template MerkleTree(LEVEL, HASH_INPUT_COUNT) {
    var N = HASH_INPUT_COUNT;
    var L = LEVEL;
    signal input inputs[N ** L];
    signal output out;

    component hh[L][N ** (L - 1)];

    for (var l = L - 1; l >= 0; l--) {
        for (var h = 0; h < N ** l; h++) {
            hh[l][h] = Poseidon(N);
            for (var i = 0; i < N; i++) {
                if (l == L - 1) {
                    hh[l][h].inputs[i] <== inputs[h * N + i];
                } else {
                    hh[l][h].inputs[i] <== hh[l + 1][h * N + i].out;
                }
            }
        }
    }
    hh[0][0].out ==> out;
}

template HashListToMerkleRoot(HASH_COUNT, HASH_INPUT_COUNT, TREE_LEVEL, TREE_HASH_INPUT_COUNT) {
    var MAX_INPUT_COUNT = 1 + HASH_COUNT * (HASH_INPUT_COUNT - 1);
    assert(MAX_INPUT_COUNT >= TREE_HASH_INPUT_COUNT ** TREE_LEVEL);

    signal input inputs[MAX_INPUT_COUNT];
    signal input length;
    signal input outputHashSelector; // TODO: derive from length
    signal input buf[HASH_INPUT_COUNT];
    signal output root;

    assert(length <= TREE_HASH_INPUT_COUNT ** TREE_LEVEL);
    assert(1 + (outputHashSelector + 1) * (HASH_INPUT_COUNT - 1) >= length); // TODO: derive from length

    // make sure that the list content is what we want
    component hl = HashListWithTrailingZero(HASH_COUNT, HASH_INPUT_COUNT);
    for (var i = 0; i < MAX_INPUT_COUNT; i++) {
        hl.inputs[i] <== inputs[i];
    }
    hl.length <== length;
    hl.outputHashSelector <== outputHashSelector;
    for (var i = 0; i < HASH_INPUT_COUNT; i++) {
        hl.buf[i] <== buf[i];
    }
    hl.diff === 0; // it works !?


    // then transform it to something cheaper to proof
    component mt = MerkleTree(TREE_LEVEL, TREE_HASH_INPUT_COUNT);
    for (var i = 0; i < TREE_HASH_INPUT_COUNT ** TREE_LEVEL; i++) {
        mt.inputs[i] <== inputs[i];
    }
    root <== mt.out;
}
//component main { public [length, outputHashSelector, buf] } = HashListToMerkleRoot(5, 4, 4, 2);  // 5447
//{
//"inputs":[0,1,2,3,4,0,0,0,0,0,0,0,0,0,0,0],
//"length":"5",
//"outputHashSelector":"1",
//"buf": ["4050345352754260300667252706570081029004026400044882557845061748628670512780", "4", "0", "0"]
//}

//component main { public [length, outputHashSelector] } = HashListToMerkleRoot(5, 4, 1, 16); // 2456
//component main { public [length, outputHashSelector] } = HashListToMerkleRoot(85, 4, 2, 16); // 41400, compile 6:43, proov 14.6, zkey 54MB

//component main = HashListWithTrailingZero(2, 4);
//{
//"inputs":[0,1,2,3,4,0,0],
//"length":"5",
//"outputHashSelector": "1",
//"buf": ["4050345352754260300667252706570081029004026400044882557845061748628670512780", "4", "0", "0"]
//}



// for x in `seq 0 255`; do echo -n "$x,"; done
// perl -MJSON::PP -e '@a = (0..255); print encode_json(\@a)'
