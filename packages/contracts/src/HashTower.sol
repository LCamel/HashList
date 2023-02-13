// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
//import "hardhat/console.sol";
//import "forge-std/console.sol";
import "./HashTowerVerifier.sol";

// HACK: PROTOTYPING ONLY: use "contract" with a fixed address to avoid compiler library settings
contract Poseidon2 {
    function poseidon(uint256[2] memory) public pure returns (uint256) {}
}
contract Poseidon4 {
    function poseidon(uint256[4] memory) public pure returns (uint256) {}
}
Poseidon2 constant P = Poseidon2(0x641BC1D96C32A2F156f0c93A71aaA9f7C3e3f882); // goerli: after block 8166444
//Poseidon4 constant P = Poseidon4(0x3b44AA63Ac599170357dC587880fC30E506612e7); // goerli: after block 8166444

uint8 constant W = 2;
uint8 constant H = 2;

contract HashTower { // PROTOTYPING ONLY: should be a library
    HashTowerVerifier private immutable verifier  = new HashTowerVerifier(); // PROTOTYPING ONLY: it should already be deployed

    uint256 private length;
    uint256[W][H] private levels;

    // TODO: merge fields
    event Add(uint8 indexed level, uint64 indexed lvFullIndex, uint256 value); // TODO: merge

    function add(uint256 toAdd) public {
        uint256 len = length; // the length before adding the item
        uint64 zeroIfLessThan = 0;
        uint64 pow = 1; // pow = W^lv
        for (uint8 lv = 0; lv < H; lv++) {
            zeroIfLessThan += pow; // W^0 + W^1 + W^2 ... (1 + 4 + 16 + ...)
            uint64 lvFullLen = uint64((len < zeroIfLessThan) ? 0 : (len - zeroIfLessThan) / pow + 1);
            uint64 lvLen = lvFullLen == 0 ? 0 : (lvFullLen - 1) % W + 1;

            if (lvLen < W) { // not full
                levels[lv][lvLen] = toAdd;
                emit Add(lv, lvFullLen, toAdd);
                break;
            } else { // full
                uint256 lvHash = P.poseidon(levels[lv]);
                levels[lv][0] = toAdd; // add it in the now-considered-being-emptied level
                emit Add(lv, lvFullLen, toAdd);
                toAdd = lvHash; // to be added in the upper level
            }

            pow *= W; // use shift if W is power of 2
        }
        length = len + 1;
    }
    // mind the order of b
    function proof() external view returns (bool) {
        //uint[2] memory a, uint[2][2] memory b, uint[2] memory c
        uint[2] memory a; uint[2][2] memory b; uint[2] memory c;
        uint256[2 + W * H] memory pub;
        /*
        pub[0] = 1;
        pub[1] = length;
        for (uint8 lv = 0; lv < H; lv++) {
            for (uint8 i = 0; i < W; i++) {
                pub[2 + lv * W + i] = levels[lv][i];
            }
        }*/
a = [uint(0x2356e3323427c270edee5b6e7e258f5c060632bccc687fc8e916c09c2f55f3cc), uint(0x170e6a1831dddabb20b412cc97f2fcbc794f34cc3f2ee5d31803b9aae58d13d3)];
b = [[uint(0x200c4c79f97d983c7e77e2158e283ad7589a807433b090031b70c793ed049da5), uint(0x29fc73ef5433d05afc9b128bedc5661a579e631c66f4b991915c63041ac18147)],[uint(0x2e71ed9e7282975ffe309f693b2a0e06b408fce939201a46d201c002e9a9a90f), uint(0x0c86f5e663abc1c80ddd14fafa703a7ed7f874b7737d221d7b5a6be6188631f0)]];
c = [uint(0x036e24ebad7b3d16cfd49fac630bc946528c3d088caa284734166ecc58474ba2), uint(0x191c6f08fb10e39ab5bd9d379831002680c4ede2f1bb8b38a86331bf167468d2)];
pub = [uint(0x0000000000000000000000000000000000000000000000000000000000000001),uint(0x0000000000000000000000000000000000000000000000000000000000000001),uint(0x0000000000000000000000000000000000000000000000000000000000000005),uint(0x0000000000000000000000000000000000000000000000000000000000000006),uint(0x115cc0f5e7d690413df64c6b9662e9cf2a3617f2743245519e19607a4417189a),uint(0x20a3af0435914ccd84b806164531b0cd36e37d4efb93efab76913a93e1f30996)];
        return verifier.verifyProof(a, b, c, pub);
    }
    /*
    function show() public view returns (uint8) {
        for (uint8 lv = H - 1; lv >= 0; lv--) {
            console.log("lv: ", lv);
            for (uint8 i = 0; i < W; i++) {
                console.log(levels[lv][i]);
            }
        }
        return 1;
    }
    */
}
