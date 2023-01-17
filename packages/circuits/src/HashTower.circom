pragma circom 2.1.2;

include "circomlib/poseidon.circom";
include "circomlib/multiplexer.circom";
include "circomlib/comparators.circom";

template HashTower(LEVELS, HASH_INPUT_COUNT) {
    signal input item;
    signal input lists[LEVELS][HASH_INPUT_COUNT];
    signal input idx[LEVELS];
    signal input tower[LEVELS][HASH_INPUT_COUNT];
    signal output out;

    // list with idx are consistent all the way up
    component listMux[LEVELS];
    component listHashes[LEVELS];
    for (var l = 0; l < LEVELS; l++) {
        listMux[l] = Multiplexer(1, HASH_INPUT_COUNT);
        for (var i = 0; i < HASH_INPUT_COUNT; i++) { listMux[l].inp[i][0] <== lists[l][i]; }
        listMux[l].sel <== idx[l];
        if (l == 0) {
            listMux[l].out[0] === item;
        } else {
            listMux[l].out[0] === listHashes[l - 1].out;
        }

        listHashes[l] = Poseidon(HASH_INPUT_COUNT);
        for (var i = 0; i < HASH_INPUT_COUNT; i++) { listHashes[l].inputs[i] <== lists[l][i]; }
    }

    // the list hashes matches with the tower hashes at one of the levels
    component towerHashes[LEVELS];
    component eq[LEVELS];
    signal eqSum[LEVELS];
    for (var l = 0; l < LEVELS; l++) {
        towerHashes[l] = Poseidon(HASH_INPUT_COUNT);
        for (var i = 0; i < HASH_INPUT_COUNT; i++) { towerHashes[l].inputs[i] <== tower[l][i]; }

        eq[l] = IsEqual();
        eq[l].in[0] <== listHashes[l].out;
        eq[l].in[1] <== towerHashes[l].out;
        eqSum[l] <== (l == 0) ? eq[l].out : eqSum[l - 1] + eq[l].out;
    }
    out <== eqSum[LEVELS - 1];
}

component main = HashTower(2, 2);
/* INPUT = {
"item": 1,
"lists":[[1, 2],
["7853200120776062878684798364095072458815029376092732009249414926327459813530", 0]
],
"idx": [0, 0],
"tower": [[3, 4],
["7853200120776062878684798364095072458815029376092732009249414926327459813530", 0]
]
}*/

