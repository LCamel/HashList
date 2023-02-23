pragma circom 2.1.0;

include "circomlib/poseidon.circom";
include "circomlib/multiplexer.circom";

template PickOne(N) {
    signal input in[N];
    signal input sel;
    signal output out;

    component mux = Multiplexer(1, N);
    for (var i = 0; i < N; i++) { mux.inp[i][0] <== in[i]; }
    mux.sel <== sel;
    out <== mux.out[0];
}

// polysum for values of V
//     len 0: 0
//     len 1: + V[0] * R^1
//     len 2: + V[1] * R^2
//     len 3: + V[2] * R^3
//            + ...
//     len N: + V[N - 1] * R^N
// we will compute all N+1 values, and pick one by len
template Polysum(N, R) {
    signal input V[N];
    signal input len;
    signal output out;

    signal outs[N + 1];
    outs[0] <== 0;
    for (var i = 1; i <= N; i++) {
        outs[i] <== outs[i - 1] + V[i - 1] * R**i;
    }

    component pickOne = PickOne(N + 1);
    for (var i = 0; i <= N; i++) {
        pickOne.in[i] <== outs[i];
    }
    pickOne.sel <== len;

    out <== pickOne.out;
}

component main = Polysum(3, 2);
/* INPUT_ = { "V": [3, 2, 5], "len": 0 } _*/ // 0
/* INPUT_ = { "V": [3, 2, 5], "len": 1 } _*/ // 3*2 = 6
/* INPUT_ = { "V": [3, 2, 5], "len": 2 } _*/ // 3*2 + 2*4 = 14
/* INPUT_ = { "V": [3, 2, 5], "len": 3 } _*/ // 3*2 + 2*4 + 5*8 = 54


















