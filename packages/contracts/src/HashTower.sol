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

    // TODO: inline this function
    function getLevelFullLengths(uint64 len) private pure returns (uint64[H] memory) {
        uint64[H] memory lengths;
        uint64 zeroIfLessThan = 0;
        uint64 pow = 1; // pow = W^lv
        for (uint8 lv = 0; lv < H; lv++) {
            zeroIfLessThan += pow; // W^0 + W^1 + W^2 ... (1 + 4 + 16 + ...)
            uint64 lvLen = (len < zeroIfLessThan) ? 0 : (len - zeroIfLessThan) / pow + 1;
            if (lvLen == 0) break;
            lengths[lv] = lvLen;
            pow *= W; // use shift if W is power of 2
        }
        return lengths;
    }
    function toInTowerLength(uint64 fullLen) private pure returns (uint64) {
        return fullLen == 0 ? 0 : (fullLen - 1) % W + 1;
    }
    function getLevelInTowerLengths(uint64 len) private pure returns (uint64[H] memory) {
        uint64[H] memory inTowerLengths;
        uint64[H] memory fullLengths = getLevelFullLengths(len);
        for (uint8 lv = 0; lv < H; lv++) {
            inTowerLengths[lv] = toInTowerLength(fullLengths[lv]);
        }
        return inTowerLengths;
    }
    function add(uint256 item) public {
        uint256 len = length; // the length before adding the item
        uint64[H] memory lvFullLengths = getLevelFullLengths(uint64(len)); // TODO: inline this function in the loop (solidity)
        uint256 toAdd = item;
        for (uint8 lv = 0; lv < H; lv++) {
            uint64 lvLen = toInTowerLength(lvFullLengths[lv]);
            if (lvLen < W) { // not full
                levels[lv][lvLen] = toAdd;
                emit Add(lv, lvFullLengths[lv], toAdd);
                break;
            } else { // full
                uint256 lvHash = P.poseidon(levels[lv]);
                levels[lv][0] = toAdd; // add it in the now-considered-being-emptied level
                emit Add(lv, lvFullLengths[lv], toAdd);
                toAdd = lvHash; // to be added in the upper level
            }
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
