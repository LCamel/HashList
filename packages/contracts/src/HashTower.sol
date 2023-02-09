// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
//import "hardhat/console.sol";
//import "forge-std/console.sol";

// HACK: PROTOTYPING ONLY: use "contract" with a fixed address to avoid compiler library settings
contract Poseidon4 {
    function poseidon(uint256[4] memory) public pure returns (uint256) {}
}
Poseidon4 constant P = Poseidon4(0x3b44AA63Ac599170357dC587880fC30E506612e7); // goerli: after block 8166444

uint8 constant W = 4;
uint8 constant H = 16;
// PROTOTYPING ONLY: should be a library
contract HashTower {
    uint256 private length;
    uint256[W][H] private levels;

    event Add(uint indexed level, uint indexed lvFullIndex, uint value); // TODO: merge

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
