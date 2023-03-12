pragma circom 2.1.0;

include "circomlib/poseidon.circom";
include "circomlib/multiplexer.circom";
include "circomlib/comparators.circom";

template PickOne(N) {
    signal input in[N];
    signal input sel;
    signal output out;

    component mux = Multiplexer(1, N);
    for (var i = 0; i < N; i++) { mux.inp[i][0] <== in[i]; }
    mux.sel <== sel;
    out <== mux.out[0];
}

template PickOne2D(M, N) {
    signal input in[M][N];
    signal input row;
    signal input col;
    signal output out <== PickOne(N)(Multiplexer(N, M)(in, row), col);
}
//component main = PickOne2D(2, 3);
/* INPUT_ = { "in": [[3, 2, 5], [9, 8, 4]], "row": 1, "col": 0 } _*/ // 9
/* INPUT_ = { "in": [[3, 2, 5], [9, 8, 4]], "row": 1, "col": 2 } _*/ // 4
/* INPUT_ = { "in": [[3, 2, 5], [9, 8, 4]], "row": 0, "col": 1 } _*/ // 2

template H2() {
    signal input in[2];
    signal output out <== Poseidon(2)(in);
}

// len 0: 0
// len 1           in[0]
// len 2:       H2(in[0], in[1])
// len 3:    H2(H2(in[0], in[1]), in[2])
// len 4: H2(H2(H2(in[0], in[1]), in[2]), in[3])
template HashListH2(N) {
    signal input in[N];
    signal input len;  // [0..N]
    signal output out; // N + 1 outputs

    signal outs[N + 1];
    outs[0] <== 0;
    outs[1] <== in[0];
    for (var i = 2; i < N + 1; i++) {
        outs[i] <== H2()([outs[i - 1], in[i - 1]]);
    }
    out <== PickOne(N + 1)(outs, len);
}
//component main = HashListH2(4);
/* INPUT_ = {
"in": [1, 2, 3, 4], "len": 4
} _*/

template MustLT(NBITS) {
    signal input a;
    signal input b;
    signal isLT <== LessThan(NBITS)([a, b]);
    isLT === 1;
}

template RotateLeft(N) {
    signal input in[N];
    signal input n; // 0 <= n < N
    signal output out[N];
    component mux = Multiplexer(N, N);
    for (var i = 0; i < N; i++) {
        for (var j = 0; j < N; j++) {
            mux.inp[i][j] <== in[(i + j) % N];
        }
    }
    mux.sel <== n;
    out <== mux.out;
}
