pragma circom 2.1.0;

include "circomlib/poseidon.circom";
include "circomlib/multiplexer.circom";
include "circomlib/comparators.circom";

template HashTower(H, W) {
    signal input item;
    signal input itemWithSiblings[H][W];
    signal input idx[H];
    signal input tower[H][W];
    signal output out;

    // Here is a Merkle proof writen in a slightly different way.
    // Instead of saying "C has A, B, D, E as siblings. Insert it at position 2",
    // here we say "C is at position 2 of A, B, C, D, E".
    //
    // item / item with siblings / idx  shall be consistent all the way up
    // item is at position idx[0] of IWS[0]
    // hash(IWS[0]) is at position idx[1] of IWS[1]
    // hash(IWS[1]) is at position idx[2] of IWS[2] ...
    //
    // item == Mux(IWS[0], idx[0])
    // hash(IWS[0]) == Mux(IWS[1], idx[1])
    // hash(IWS[1]) == Mux(IWS[2], idx[2]) ...
    component iwsMux[H];
    component iwsHashes[H];
    for (var lv = 0; lv < H; lv++) {
        iwsMux[lv] = Multiplexer(1, W); // TODO: use a 1-D component for readability
        for (var i = 0; i < W; i++) { iwsMux[lv].inp[i][0] <== itemWithSiblings[lv][i]; }
        iwsMux[lv].sel <== idx[lv];
        if (lv == 0) {
            iwsMux[lv].out[0] === item;
        } else {
            iwsMux[lv].out[0] === iwsHashes[lv - 1].out;
        }

        iwsHashes[lv] = Poseidon(W);
        for (var i = 0; i < W; i++) { iwsHashes[lv].inputs[i] <== itemWithSiblings[lv][i]; }
    }

    // one of the IWS hashes  equals with   one of the tower hashes   at one of the levels
    // => a IWS matches with a whole tower level
    // => the original item belongs to one of the roots in that level
    component towerHashes[H];
    component eq[H];
    signal eqSum[H];
    for (var lv = 0; lv < H; lv++) {
        towerHashes[lv] = Poseidon(W);
        for (var i = 0; i < W; i++) { towerHashes[lv].inputs[i] <== tower[lv][i]; }

        eq[lv] = IsEqual();
        eq[lv].in[0] <== iwsHashes[lv].out;
        eq[lv].in[1] <== towerHashes[lv].out;
        eqSum[lv] <== (lv == 0) ? eq[lv].out : eqSum[lv - 1] + eq[lv].out;
    }
    out <== eqSum[H - 1]; // shall be 1 (matches at 1 level)
}

component main = HashTower(2, 2);
/* INPUT = {
"item": 1,
"itemWithSiblings":[[1, 2],
["7853200120776062878684798364095072458815029376092732009249414926327459813530", 0]
],
"idx": [0, 0],
"tower": [[3, 4],
["7853200120776062878684798364095072458815029376092732009249414926327459813530", 0]
]
}*/

