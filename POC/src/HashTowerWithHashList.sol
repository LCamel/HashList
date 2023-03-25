// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

//import "hardhat/console.sol";
//import "./HashTowerWithHashListH20W4Verifier.sol";
contract Poseidon2 {
    function poseidon(uint256[2] memory) public pure returns (uint256) {}
}
Poseidon2 constant P2 = Poseidon2(0xd9145CCE52D386f254917e481eB44e9943F39138);

// capacity = W * (W**0 + W**1 + ... + W**(H - 1)) = W * (W**H - 1) / (W - 1)
// 4 * (4^0 + 4^1 + 4^2 + ... 4^19) = 1_466_015_503_700
uint256 constant H = 20;
uint256 constant W = 4;
uint256 constant CAPACITY = 1_466_015_503_700; // https://github.com/ethereum/solidity/issues/13724

uint256 constant SNARK_SCALAR_FIELD =
    21888242871839275222246405745257275088548364400416034343698204186575808495617;


contract HashTowerWithHashList {
    //HashTowerWithHashListH20W4Verifier private immutable verifier = new HashTowerWithHashListH20W4Verifier();
    uint256 private _count;
    uint256[H] private D;
    uint256[H] private DD;

    event Add(uint8 indexed level, uint64 indexed lvFullIndex, uint256 value); // TODO: merge fields

    function add(uint256 toAdd) public {
        //uint256 debugCounter;
        //uint256 gasMark;

        require(toAdd < SNARK_SCALAR_FIELD, "HashTowerWithHashList: toAdd must be < SNARK_SCALAR_FIELD");

        uint256 count = _count;
        require(count < CAPACITY, "HashTowerWithHashList: full");

        uint256 z;
        uint256 fl;
        uint256 ll;
        uint256 lv;
        uint256 W_pow_lv = 1; // W ** lv

        // find the lowest level that has space
        while (true) {
            z += W_pow_lv;
            fl = (count < z) ? 0 : (count - z) / W_pow_lv + 1;
            ll = (fl == 0) ? 0 : (fl - 1) % W + 1;
            if (ll < W) break;
            lv++;
            W_pow_lv *= W;
        }
        // append and go downward
        uint256 v = (lv > 0) ? D[lv - 1] : toAdd;
        emit Add(uint8(lv), uint64(fl), v);
        uint256 d = (ll == 0) ? v : P2.poseidon([D[lv], v]);
        uint256 dd = (fl == ll) ? d : P2.poseidon([DD[lv + 1], d]); // fl == ll means there is no level above
        //uint256 d; if (ll == 0) { d = v; } else { gasMark = gasleft(); d = P2.poseidon([D[lv], v]); debugCounter += gasMark - gasleft(); }
        //uint256 dd; if (fl == ll) { dd = d; } else { gasMark = gasleft(); dd = P2.poseidon([DD[lv + 1], d]); debugCounter += gasMark - gasleft(); }
        uint256 prevDd;
        while (true) {
            D[lv] = d;
            DD[lv] = dd;
            if (lv == 0) break;
            z -= W_pow_lv;
            prevDd = dd;
            lv--;
            W_pow_lv /= W;
            // the rest levels are all full
            fl = (count - z) / W_pow_lv + 1;
            v = (lv > 0) ? D[lv - 1] : toAdd;
            emit Add(uint8(lv), uint64(fl), v);
            d = v;
            dd = P2.poseidon([prevDd, d]);
            //gasMark = gasleft(); dd = P2.poseidon([prevDd, d]); debugCounter += gasMark - gasleft();
        }
        //console.log("count: ", count, " debugCounter: ", debugCounter);
        _count = count + 1;
    }

    function getCountAndDd() public view returns (uint256, uint256) {
        return (_count, DD[0]);
    }
    /*
    function prove(uint[2] memory a, uint[2][2] memory b, uint[2] memory c) external view returns (bool) {
        uint256[1] memory pub;
        pub[0] = dd;
        return verifier.verifyProof(a, b, c, pub);
    }
    */
}

//uint256 debugCounter;
//uint256 gasMark;
//console.log("count: ", count, " debugCounter: ", debugCounter);

//uint256 d; if (ll == 0) { d = v; } else { d = P2.poseidon([D[lv], v]); debugCounter++; }
//uint256 dd; if (fl == ll) { dd = d; } else { dd = P2.poseidon([DD[lv + 1], d]); debugCounter++; }
//dd = P2.poseidon([prevDd, d]); debugCounter++;

//uint256 d; if (ll == 0) { d = v; } else { gasMark = gasleft(); d = P2.poseidon([D[lv], v]); debugCounter += gasMark - gasleft(); }
//uint256 dd; if (fl == ll) { dd = d; } else { gasMark = gasleft(); dd = P2.poseidon([DD[lv + 1], d]); debugCounter += gasMark - gasleft(); }
//gasMark = gasleft(); dd = P2.poseidon([prevDd, d]); debugCounter += gasMark - gasleft();
