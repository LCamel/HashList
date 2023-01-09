pragma circom 2.1.0;
include "./HashList.circom";
component main { public [length, outputHashSelector, buf] } = HashListToMerkleRoot(1365, 4, 12, 2);

/*
template instances: 154
non-linear constraints: 1481344
linear constraints: 0
public inputs: 6
public outputs: 1
private inputs: 4096
private outputs: 0
wires: 1477253
labels: 4864716
*/