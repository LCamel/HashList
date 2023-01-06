// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

struct HashListData4 {
    uint256 length;
    uint256[4] buf;
}

library Poseidon4 {
    function poseidon(uint256[4] memory) public pure returns (uint256) {}
}

interface IVerifier4 {
    function verifyProof(
            uint[2] memory a,
            uint[2][2] memory b,
            uint[2] memory c,
            uint[7] memory input
        ) external view returns (bool r);
}

library HashList4 {
    uint256 constant HASH_INPUT_COUNT = 4;
    // no init() needed
    function add(HashListData4 storage self, uint256 item) public {
        uint256 len = self.length;
        if (len <= 1) {
            self.buf[len] = item;
        } else {
            // (prev) len: 0 1 2 3 4 5 6 7 8 9 10 11 12
            //      index: 0 1 2 3 1 2 3 1 2 3 1  2  3
            uint256 index = (len - 1) % (HASH_INPUT_COUNT - 1) + 1;
            if (index == 1) {
                self.buf[0] = Poseidon4.poseidon(self.buf);
            }
            self.buf[index] = item;
        }
        self.length = len + 1;
    }

    error LengthExceedTreeLeavesError();
    error UnsupportedArityError();
    error UnsupportedDepthError();
    error VerificationError();

    function verifyMerkleRoot(HashListData4 storage self, uint256[2] memory a, uint256[2][2] memory b, uint256[2] memory c, uint256 depth, uint256 arity, uint256 root) public view {
        uint256 len = self.length;
        if (len > arity ** depth) {
            revert LengthExceedTreeLeavesError();
        }

        IVerifier4 verifier;
        if (arity == 2) {
            if (depth == 4) {
                verifier = IVerifier4(0x1234567890123456789012345678901234567890);
            } else {
                revert UnsupportedDepthError();
            }
        } else if (arity == 16) {
            revert UnsupportedDepthError();
        } else {
            revert UnsupportedArityError();
        }

        uint256[7] memory input;
        input[0] = len;
        input[1] = (len < 2) ? 0 : (len - 2) / (HASH_INPUT_COUNT - 1); // output selector
        input[2] = self.buf[0];
        input[3] = self.buf[1];
        input[4] = self.buf[2];
        input[5] = self.buf[3];
        input[6] = root;

        if (!verifier.verifyProof(a, b, c, input)) {
            revert VerificationError();
        }
    }
}
