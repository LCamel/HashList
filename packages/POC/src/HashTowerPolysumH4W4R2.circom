pragma circom 2.1.0;

include "HashTowerPolysum.circom";

component main { public [ dd ] } = HashTowerWithDigest(4, 4, 2);
