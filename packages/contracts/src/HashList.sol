// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

// TODO: naming
library Poseidon4 {
    function poseidon(uint256[4] memory) public pure returns (uint256) {}
}

struct HashListData4 {
    uint256 length;
    uint256[4] buf;
}

// no init() needed

// (prev) len: 0 1 2 3 4 5 6 7 8 9 10 11 12
//      index: 0 1 2 3 1 2 3 1 2 3 1  2  3

library HashList4 {
    uint constant HASH_WIDTH = 4;
    function add(HashListData4 storage self, uint256 item) public {
        uint len = self.length;
        if (len <= 1) {
            self.buf[len] = item;
        } else {
            uint index = (len - 1) % (HASH_WIDTH - 1) + 1;
            if (index == 1) {
                self.buf[0] = Poseidon4.poseidon(self.buf);
            }
            self.buf[index] = item;
        }
        self.length = len + 1;
    }
}
