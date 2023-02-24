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
    signal output out;

    component pickRow = Multiplexer(N, M); // M by N
    for (var i = 0; i < M; i++) {
        for (var j = 0; j < N; j++) {
            pickRow.inp[i][j] <== in[i][j];
        }
    }
    pickRow.sel <== row;

    component pickCol = PickOne(N);
    for (var j = 0; j < N; j++) {
        pickCol.in[j] <== pickRow.out[j];
    }
    pickCol.sel <== col;

    out <== pickCol.out;
}
//component main = PickOne2D(2, 3);
/* INPUT_ = { "in": [[3, 2, 5], [9, 8, 4]], "row": 1, "col": 0 } _*/ // 9
/* INPUT_ = { "in": [[3, 2, 5], [9, 8, 4]], "row": 1, "col": 2 } _*/ // 4
/* INPUT_ = { "in": [[3, 2, 5], [9, 8, 4]], "row": 0, "col": 1 } _*/ // 2


// polysum for values of in
//     len 0: 0
//     len 1: + in[0] * R^1
//     len 2: + in[1] * R^2
//     len 3: + in[2] * R^3
//            + ...
//     len N: + in[N - 1] * R^N
// we will compute all N+1 values, and pick one by len
template Polysum(N, R) {
    signal input in[N];
    signal input len;
    signal output out;

    signal outs[N + 1];
    outs[0] <== 0;
    for (var i = 1; i <= N; i++) {
        outs[i] <== outs[i - 1] + in[i - 1] * R**i;
    }

    component pickOne = PickOne(N + 1);
    for (var i = 0; i <= N; i++) {
        pickOne.in[i] <== outs[i];
    }
    pickOne.sel <== len;

    out <== pickOne.out;
}

//component main = Polysum(3, 2);
/* INPUT_ = { "in": [3, 2, 5], "len": 0 } _*/ // 0
/* INPUT_ = { "in": [3, 2, 5], "len": 1 } _*/ // 3*2 = 6
/* INPUT_ = { "in": [3, 2, 5], "len": 2 } _*/ // 3*2 + 2*4 = 14
/* INPUT_ = { "in": [3, 2, 5], "len": 3 } _*/ // 3*2 + 2*4 + 5*8 = 54



template HashThenPolysum(N, R) {
    signal input in[N];
    signal input len;
    signal output out;

    component hashes[N];
    for (var i = 0; i < N; i++) {
        hashes[i] = Poseidon(1);
        hashes[i].inputs[0] <== in[i];
    }

    component polysum = Polysum(N, R);
    for (var i = 0; i < N; i++) {
        polysum.in[i] <== hashes[i].out;
    }
    polysum.len <== len;

    out <== polysum.out;
}
//component main = HashThenPolysum(3, 2);
/* INPUT_ = { "in": [3, 2, 5], "len": 0 } _*/ // 0
/* INPUT_ = { "in": [3, 2, 5], "len": 1 } _*/ // (P1(3) * R) % FIELD_SIZE = 12036827054198137122095917864738637220594325056983112151838150417400356960168n
/* INPUT_ = { "in": [3, 2, 5], "len": 2 } _*/ // (P1(3) * R + P1(2) * R*R) % FIELD_SIZE = 2844269233670182769950642289177770470138680308303478515779552930539198706330n
/* INPUT_ = { "in": [3, 2, 5], "len": 3 } _*/ // (P1(3) * R + P1(2) * R*R + P1(5) * R*R*R) % FIELD_SIZE = 2147773328963507696505569143435156011647533690827769217540132470656523759227n


template CheckDigestAndPickOne(M, N, R) {
    signal input in[M][N];
    signal input len[M];
    signal input dd;
    signal input row;
    signal input col;
    signal output out;

    // check col < len[row]
    component pickLen = PickOne(M);
    for (var i = 0; i < M; i++) {
        pickLen.in[i] <== len[i];
    }
    pickLen.sel <== row;
    component lt = LessThan(8);
    lt.in[0] <== col;
    lt.in[1] <== pickLen.out;
    lt.out === 1;

    // check dd
    component rowDigest[M];
    for (var i = 0; i < M; i++) {
        rowDigest[i] = HashThenPolysum(N, R);
        for (var j = 0; j < N; j++) {
            rowDigest[i].in[j] <== in[i][j];
        }
        rowDigest[i].len <== len[i];
    }
    component digestDigest = Polysum(M, R);
    for (var i = 0; i < M; i++) {
        digestDigest.in[i] <== rowDigest[i].out;
    }
    digestDigest.len <== M;
    dd === digestDigest.out;

    // pick in[row][col]
    component pickOne2D = PickOne2D(M, N);
    for (var i = 0; i < M; i++) {
        for (var j = 0; j < N; j++) {
            pickOne2D.in[i][j] <== in[i][j];
        }
    }
    pickOne2D.row <== row;
    pickOne2D.col <== col;

    out <== pickOne2D.out;
}

//component main = CheckDigestAndPickOne(3, 4, 2);
/* INPUT_ = {
"in":[["28","29","0","0"],["4425808326989093903082835769043223069214235808345618319380033718637558481182","15041493709894144391686004263009416545429874906082969262207852745149669098323","6968536927364383986045146745728774935447394079342337397232932107880398225407","0"],["18653930126630241143636189224111212520399813625070913524850974236733224889211","0","0","0"]],
"dd": "6509403411030874397524326380285699347281924026202748014750402176956663965254",
"len": [2, 3, 1],
"row": "1",
"col": "2"
} _*/