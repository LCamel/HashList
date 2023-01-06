// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

// TODO: naming
library Poseidon2 {
    function poseidon(uint256[2] memory) public pure returns (uint256) {}
}
library Poseidon3 {
    function poseidon(uint256[3] memory) public pure returns (uint256) {}
}
library Poseidon4 {
    function poseidon(uint256[4] memory) public pure returns (uint256) {}
}
library Poseidon5 {
    function poseidon(uint256[5] memory) public pure returns (uint256) {}
}
library Poseidon6 {
    function poseidon(uint256[6] memory) public pure returns (uint256) {}
}

struct HashListData2 {
    uint256 length;
    uint256[2] buf;
}
struct HashListData3 {
    uint256 length;
    uint256[3] buf;
}
struct HashListData4 {
    uint256 length;
    uint256[4] buf;
}
struct HashListData5 {
    uint256 length;
    uint256[5] buf;
}
struct HashListData6 {
    uint256 length;
    uint256[6] buf;
}

// no init() needed

// (prev) len: 0 1 2 3 4 5 6 7 8 9 10 11 12
//      index: 0 1 2 3 1 2 3 1 2 3 1  2  3

library HashList2 {
    uint constant HASH_WIDTH = 2;
    function add(HashListData2 storage self, uint256 item) public {
        uint len = self.length;
        if (len <= 1) {
            self.buf[len] = item;
        } else {
            uint index = (len - 1) % (HASH_WIDTH - 1) + 1;
            if (index == 1) {
                self.buf[0] = Poseidon2.poseidon(self.buf);
            }
            self.buf[index] = item;
        }
        self.length = len + 1;
    }
}
library HashList3 {
    uint constant HASH_WIDTH = 3;
    function add(HashListData3 storage self, uint256 item) public {
        uint len = self.length;
        if (len <= 1) {
            self.buf[len] = item;
        } else {
            uint index = (len - 1) % (HASH_WIDTH - 1) + 1;
            if (index == 1) {
                self.buf[0] = Poseidon3.poseidon(self.buf);
            }
            self.buf[index] = item;
        }
        self.length = len + 1;
    }
}
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
library HashList5 {
    uint constant HASH_WIDTH = 5;
    function add(HashListData5 storage self, uint256 item) public {
        uint len = self.length;
        if (len <= 1) {
            self.buf[len] = item;
        } else {
            uint index = (len - 1) % (HASH_WIDTH - 1) + 1;
            if (index == 1) {
                self.buf[0] = Poseidon5.poseidon(self.buf);
            }
            self.buf[index] = item;
        }
        self.length = len + 1;
    }
}
library HashList6 {
    uint constant HASH_WIDTH = 6;
    function add(HashListData6 storage self, uint256 item) public {
        uint len = self.length;
        if (len <= 1) {
            self.buf[len] = item;
        } else {
            uint index = (len - 1) % (HASH_WIDTH - 1) + 1;
            if (index == 1) {
                self.buf[0] = Poseidon6.poseidon(self.buf);
            }
            self.buf[index] = item;
        }
        self.length = len + 1;
    }
}
