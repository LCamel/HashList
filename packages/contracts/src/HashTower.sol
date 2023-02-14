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

    // TODO: function getDimensions()

    function add(uint256 toAdd) public {
        // TODO: check capacity
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
    // mind the order of b columns
    function prove(uint[2] memory a, uint[2][2] memory b, uint[2] memory c) external view returns (bool) {
        uint256[2 + W * H] memory pub;

        uint256 len = length; // TODO: uint64
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
        return verifier.verifyProof(a, b, c, pub);
    }

    function lengthAndLevels() public view returns (uint64, uint256[][] memory) {
        uint256[][] memory _levels = new uint256[][](H);
        for (uint8 lv = 0; lv < H; lv++) {
            _levels[lv] = new uint256[](W);
            for (uint8 i = 0; i < W; i++) {
                _levels[lv][i] = levels[lv][i];
            }
        }
        return (uint64(length), _levels);
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
