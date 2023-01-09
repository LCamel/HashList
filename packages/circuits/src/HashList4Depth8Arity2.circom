pragma circom 2.1.0;
include "./HashList.circom";
component main { public [length, outputHashSelector, buf] } = HashListToMerkleRoot(85, 4, 8, 2);

/*
template instances: 154
non-linear constraints: 92544
linear constraints: 0
public inputs: 6
public outputs: 1
private inputs: 256
private outputs: 0
wires: 92293
labels: 304076
*/
