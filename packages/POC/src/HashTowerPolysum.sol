// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./HashTowerPolysumH4W4R2Verifier.sol";

contract Poseidon1 {
    function poseidon(uint256[1] memory) public pure returns (uint256) {}
}
Poseidon1 constant P1 = Poseidon1(0x1111111122222222333333334444444400000001);

uint256 constant FIELD_SIZE = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
uint8 constant W = 4;
uint8 constant H = 16;
uint256 constant R = 2;

contract HashTowerPolysum {
    HashTowerPolysumH4W4R2Verifier private immutable verifier = new HashTowerPolysumH4W4R2Verifier();
    uint64 private count;
    uint256[H] private D;
    uint256 private dd;

    event Add(uint8 indexed level, uint64 indexed lvFullIndex, uint256 value); // TODO: merge fields

    function add(uint256 toAdd) public {
        // TODO: check capacity or forcing a high capacity tower

        uint64 c = count;
        uint256 dd1 = dd;
        uint64 z = 0;
        uint64 powWLv = 1; // powWLv = W ** lv
        uint256 powRLv = R; // powRLv = R ** (lv + 1)
        for (uint8 lv = 0; true; lv++) {
            // inlined length computations
            z += powWLv;
            uint64 fl = c < z ? 0 : ((c - z) / powWLv) + 1;
            uint8 ll = fl == 0 ? 0 : uint8((fl - 1) % W + 1); // TODO: 255

            emit Add(lv, fl, toAdd);
            uint256 P1ToAdd = P1.poseidon([toAdd]); // if we don't extract this variable, compiler will complain about "stack too deep"
            if (ll == 0) {        // new level
                //let d1 = (P1(toAdd) * R) % FIELD_SIZE;
                //dd1 = (dd1 + d1 * R ** BigInt(lv + 1)) % FIELD_SIZE;
                uint256 d1 = mulmod(P1ToAdd, R, FIELD_SIZE);
                dd1 = addmod(dd1, mulmod(d1, powRLv, FIELD_SIZE), FIELD_SIZE);
                D[lv] = d1;
                break;
            } else if (ll < W) {  // not full
                //let d0 = D[lv];
                //let d1 = (d0 + P1(toAdd) * R ** BigInt(ll + 1)) % FIELD_SIZE;
                //dd1 = (dd1 + (d1 + FIELD_SIZE - d0) * R ** BigInt(lv + 1)) % FIELD_SIZE;
                uint256 d0 = D[lv];
                uint256 powRLl = R ** (ll + 1); // TODO: overflow !!!!!!
                uint256 d1 = addmod(d0, mulmod(P1ToAdd, powRLl, FIELD_SIZE), FIELD_SIZE);
                dd1 = addmod(dd1, mulmod(addmod(d1, FIELD_SIZE - d0, FIELD_SIZE), powRLv, FIELD_SIZE), FIELD_SIZE);
                D[lv] = d1;
                break;
            } else {              // full
                //let d0 = D[lv];
                //let d1 = (P1(toAdd) * R) % FIELD_SIZE;
                //dd1 = (dd1 + (d1 + FIELD_SIZE - d0) * R ** BigInt(lv + 1)) % FIELD_SIZE;
                uint256 d0 = D[lv];
                uint256 d1 = mulmod(P1ToAdd, R, FIELD_SIZE);
                dd1 = addmod(dd1, mulmod(addmod(d1, FIELD_SIZE - d0, FIELD_SIZE), powRLv, FIELD_SIZE), FIELD_SIZE);
                D[lv] = d1;
                toAdd = d0;
            }
            powWLv = powWLv * W;
            powRLv = mulmod(powRLv, R, FIELD_SIZE);
        }
        dd = dd1;
        count = c + 1;
    }

    function getCountAndDd() public view returns (uint64, uint256) {
        return (count, dd);
    }

    function prove(uint[2] memory a, uint[2][2] memory b, uint[2] memory c) external view returns (bool) {
        uint256[1] memory pub;
        pub[0] = dd;
        return verifier.verifyProof(a, b, c, pub);
    }
}
