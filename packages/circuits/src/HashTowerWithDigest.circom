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

//component main = Polysum(3, 2);
/* INPUT_ = { "V": [3, 2, 5], "len": 0 } _*/ // 0
/* INPUT_ = { "V": [3, 2, 5], "len": 1 } _*/ // 3*2 = 6
/* INPUT_ = { "V": [3, 2, 5], "len": 2 } _*/ // 3*2 + 2*4 = 14
/* INPUT_ = { "V": [3, 2, 5], "len": 3 } _*/ // 3*2 + 2*4 + 5*8 = 54



template HashThenPolysum(N, R) {
    signal input V[N];
    signal input len;
    signal output out;

    component hashes[N];
    for (var i = 0; i < N; i++) {
        hashes[i] = Poseidon(1);
        hashes[i].inputs[0] <== V[i];
    }

    component polysum = Polysum(N, R);
    for (var i = 0; i < N; i++) {
        polysum.V[i] <== hashes[i].out;
    }
    polysum.len <== len;

    out <== polysum.out;
}
//component main = HashThenPolysum(3, 2);
/* INPUT_ = { "V": [3, 2, 5], "len": 0 } _*/ // 0
/* INPUT_ = { "V": [3, 2, 5], "len": 1 } _*/ // (P1(3) * R) % FIELD_SIZE = 12036827054198137122095917864738637220594325056983112151838150417400356960168n
/* INPUT_ = { "V": [3, 2, 5], "len": 2 } _*/ // (P1(3) * R + P1(2) * R*R) % FIELD_SIZE = 2844269233670182769950642289177770470138680308303478515779552930539198706330n
/* INPUT_ = { "V": [3, 2, 5], "len": 3 } _*/ // (P1(3) * R + P1(2) * R*R + P1(5) * R*R*R) % FIELD_SIZE = 2147773328963507696505569143435156011647533690827769217540132470656523759227n
