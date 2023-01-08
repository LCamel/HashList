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
library HashList4Depth4Arity2Verifier {} // address only


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

        // choose the verifier
        IVerifier4 verifier;
        if (arity == 2) {
            if (depth == 4) {
                //verifier = IVerifier4(0xf3FAdCE461eF884d3c12819FeC77964501B907B9);
                verifier = IVerifier4(address(HashList4Depth4Arity2Verifier));
            } else {
                revert UnsupportedDepthError();
            }
        } else if (arity == 16) {
            revert UnsupportedDepthError();
        } else {
            revert UnsupportedArityError();
        }

        // prepare input
        uint256[7] memory input;
        input[0] = len;
        input[1] = (len < 2) ? 0 : (len - 2) / (HASH_INPUT_COUNT - 1); // output selector
        uint256 bound = (len <= 1) ? len : (len - 2) % (4 - 1) + 2;
        for (uint256 i = 0; i < bound; i++) {
            input[2 + i] = self.buf[i];
        }
        // zeros
        input[6] = root;


        if (!verifier.verifyProof(a, b, c, input)) {
            revert VerificationError();
        }
    }
}
