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

// an interface to a hash function that can accept 2 inputs
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
    signal output out; // one of the N + 1 possibilities

    signal outs[N + 1];
    outs[0] <== 0;     // default 0
    outs[1] <== in[0]; // no hash
    for (var i = 2; i < N + 1; i++) {
        outs[i] <== H2()([outs[i - 1], in[i - 1]]);
    }
    out <== PickOne(N + 1)(outs, len);
}

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
    // row 0: rotate 0, row 1: rotate 1, ...
    component mux = Multiplexer(N, N);
    for (var i = 0; i < N; i++) {
        for (var j = 0; j < N; j++) {
            mux.inp[i][j] <== in[(i + j) % N];
        }
    }
    mux.sel <== n;
    out <== mux.out;
}

template Reverse(N) {
    signal input in[N];
    signal output out[N];
    for (var i = 0; i < N; i++) {
        out[i] <== in[N - i - 1];
    }
}

// Be specific.
template CheckDigestAndPickRoot(H, W) {
    signal input L[H][W];
    signal input LL[H];
    signal input h;
    signal input dd;
    signal input rootLevel;
    signal input rootIdxInL;
    signal output root;

    MustLT(8)(h, H);
    MustLT(8)(rootLevel, h);
    MustLT(8)(rootIdxInL, PickOne(H)(LL, rootLevel));

    // check dd
    signal D[H];
    for (var lv = 0; lv < H; lv++) {
        D[lv] <== HashListH2(W)(L[lv], PickOne(H)(LL, lv));
    }
    //                    h=4         H=10
    //       index: 0 1 2 3 4 5 6 7 8 9
    //           D: d c b a 0 0 0 0 0 0
    //     reverse: 0 0 0 0 0 0 a b c d
    // rotate left: a b c d 0 0 0 0 0 0
    signal dd2 <== HashListH2(H)(RotateLeft(H)(Reverse(H)(D), H - h), h);
    dd2 === dd;

    root <== PickOne2D(H, W)(L, rootLevel, rootIdxInL);
}
