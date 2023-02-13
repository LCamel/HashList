// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
//import "hardhat/console.sol";
import "forge-std/console.sol";
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

        uint256 len = length;
        console.log("len: ", len);
        pub[0] = 1; // the circuit output must be "true"
        pub[1] = len < 1 ? 0 : (len - 1) % W + 1;
        uint64 zeroIfLessThan = 0;
        uint64 pow = 1; // pow = W^lv
        for (uint8 lv = 0; lv < H; lv++) {
            zeroIfLessThan += pow; // W^0 + W^1 + W^2 ... (1 + 4 + 16 + ...)
            uint64 lvLen = uint64((len < zeroIfLessThan) ? 0 : ((len - zeroIfLessThan) / pow) % W + 1);
            if (lvLen == 0) break;
            for (uint8 i = 0; i < lvLen; i++) {
                pub[2 + lv * W + i] = levels[lv][i];
            }
            pow *= W;
        }
        for (uint i = 0; i < 6; i++) {
            console.log(i, pub[i]);
        }
a = [uint(0x1c84d7b34c731bd9d27c7ce2ee6617653b27afdcc425edd90a2c4e9591d3a33f), uint(0x29ce24df05204095fb682b16f120a74737583926d32d54ae71dce59eb69f3a32)];
b = [[uint(0x13a9beee405c497c6ecc5bbe5587c2a71b62b764f12c2264c98242d107443509), uint(0x2ddef2d7f543f8542bc9e7b625b7e1eb9884f3ad72f146dc4041927994403ff9)],[uint(0x0163caee3997c322b7db80307cffc42784465e3f21415c4d22a723204cd3ed58), uint(0x1b2243b4dfee2df88ebee79509929ebcf7d5bd7ddcf0692d0b64c6c68aaae122)]];
c = [uint(0x06c4625e4cc6c59cc154bb491d1bd5de96dae2e8fd70b8e76a8c0b6f57490299), uint(0x0f70fc63789fc4fa3f7c3e268f617e8181a94e3b97bc62f9446d6cc03a220e25)];
//pub = [uint(0x0000000000000000000000000000000000000000000000000000000000000001),uint(0x0000000000000000000000000000000000000000000000000000000000000002),uint(0x0000000000000000000000000000000000000000000000000000000000000005),uint(0x0000000000000000000000000000000000000000000000000000000000000006),uint(0x115cc0f5e7d690413df64c6b9662e9cf2a3617f2743245519e19607a4417189a),uint(0x20a3af0435914ccd84b806164531b0cd36e37d4efb93efab76913a93e1f30996)];

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
