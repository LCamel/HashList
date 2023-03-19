pragma circom 2.1.4;

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

template IsNonZero() {
    signal input in;
    signal output out <== NOT()(IsZero()(in));
}
template Must() {
    signal input in;
    in === 1;
}
template MustEQ() {
    signal input a;
    signal input b;
    a === b;
}

function compute_ll(W, count, lv) {
    var z = (W**(lv + 1) - 1) \ (W - 1);
    return (count < z) ? 0 : ((count - z) \ W**lv) % W + 1;
}
function compute_h(W, count) {
    var z = 0;
    var h = 0;
    for (var lv = 0; 1 == 1; lv++) {
        z += W ** lv;
        if (count < z) return h;
        h++;
    }
    return 4242; // impossible
}
template Compute_LL_h(H, W, H_BITS, W_BITS) { // keep 1 bit more
    signal input count;
    signal output LL[H];
    signal output h;

    h <-- compute_h(W, count);
    Must()( LessEqThan(H_BITS)([ h, H ]));
    var s = 0;
    for (var lv = 0; lv < H; lv++) {
        LL[lv] <-- compute_ll(W, count, lv);
        Must()( LessEqThan(W_BITS)( [ LL[lv], W ]));
        MustEQ()( LessThan(H_BITS)( [ lv, h ] ),  IsNonZero()( LL[lv] ) );
        s += LL[lv] * W**lv;
    }
    s === count;
}

template Include(N) {
    signal input in[N];
    signal input v;
    signal output out;

    signal prod[N];
    prod[0] <== in[0] - v;
    for (var i = 1; i < N; i++) {
        prod[i] <== prod[i - 1] * (in[i] - v);
    }
    out <== IsZero()(prod[N - 1]);
}

template LessThanArray(N) { // N >= 1   complexity: 2N
    signal input v; // v <= N   a larger v will automatically fail
    signal output out[N]; // out[i] = i < v ? 1 : 0;

    var oneCount = 0;
    for (var i = 0; i < N; i++) {
        out[i] <-- i < v ? 1 : 0;
        (out[i] - 0) * (out[i] - 1) === 0; // out[i] must be 0 or 1
        oneCount += out[i];
    }
    oneCount === v; // it can hold only when v <= N

    signal isUp[N - 1]; // isUp[i] = (out[i] == 0) && (out[i + 1] == 1)
    var upCount = 0;
    for (var i = 0; i < N - 1; i++) {
        isUp[i] <== (1 - out[i]) * out[i + 1];
        upCount += isUp[i];
    }
    upCount === 0; // no 0 to 1  =>  all 1 must be at the left most side
}

template IncludeInPrefix(N) { // complexity 5N
    signal input in[N];
    signal input prefixLen; // 0 <= prefixLen <= N
    signal input v;
    signal output out; // 1 iff v is in  in[0 .. prefixLen - 1]

    signal ltPrefix[N] <== LessThanArray(N)(prefixLen);
    signal isGood[N];
    var goodCount = 0;
    for (var i = 0; i < N; i++) {
        isGood[i] <== AND()(IsEqual()([in[i], v]), ltPrefix[i]);
        goodCount += isGood[i];
    }
    out <== IsNonZero()(goodCount);
}

template MerkleRoot(H, W) {
    signal input C[H - 1][W];
    signal input rootLv;
    signal input leaf;
    signal output root;

    signal TBI[H];
    TBI[0] <== leaf;
    for (var lv = 0; lv < H - 1; lv++) {
        Must()(OR() ( NOT()( LessThan(8)([lv, rootLv]) )  , Include(W)( C[lv], TBI[lv] ) ) );
        TBI[lv + 1] <== HashListH2(W)(C[lv], W);
    }
    root <== PickOne(H)(TBI, rootLv);
}

template HashTowerWithDigest2(H, W) {
    signal input count;
    signal input dd;
    signal input D[H];
    signal input rootLv;
    signal input RL[W];
    signal input C[H - 1][W];
    signal input leaf;

    Must()(IsNonZero()(count));
    signal LL[H];
    signal h;
    (LL, h) <== Compute_LL_h(H, W, 6, 5)(count);
    Must()(LessEqThan(8)([rootLv, h]));

    MustEQ()(HashListH2(H)(RotateLeft(H)(Reverse(H)(D), H - h), h), dd); // D[] matches with dd
    signal rootll <== PickOne(H)(LL, rootLv); // root level length
    MustEQ()(HashListH2(W)(RL, rootll), PickOne(H)(D, rootLv)); // RL matches with D[rootLv]
    Must()(IncludeInPrefix(W)(RL, rootll, MerkleRoot(H, W)(C, rootLv, leaf))); // root in RL
}

//component main = HashTowerWithDigest2(5, 4);
//component main = Include(20);
