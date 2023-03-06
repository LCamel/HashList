pragma circom 2.1.0;
include "./HashList.circom";
component main { public [length, outputHashSelector, buf] } = HashListToMerkleRoot(5, 4, 4, 2);

/*
% time ./c.sh HashList4Depth4Arity2
template instances: 154
non-linear constraints: 5744
linear constraints: 0
public inputs: 6
public outputs: 1
private inputs: 16
private outputs: 0
wires: 5733
labels: 19036

./c.sh HashList4Depth4Arity2  63.01s user 2.58s system 106% cpu 1:01.34 total
*/
