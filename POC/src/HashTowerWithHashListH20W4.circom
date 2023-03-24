pragma circom 2.1.0;

include "./HashTowerWithHashList.circom";

component main { public [ count, dd ]} = HashTowerWithDigest(20, 4, 5, 3);
