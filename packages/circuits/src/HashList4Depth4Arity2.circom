pragma circom 2.1.0;
include "./HashList.circom";
component main { public [length, outputHashSelector, buf] } = HashListToMerkleRoot(5, 4, 4, 2);

// non-linear constraints: 5744
