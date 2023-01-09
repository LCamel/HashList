// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "./HashList.sol";

contract HashListExample4 {
    using HashList4 for HashListData4;
    HashListData4 hld;
    function add(uint item) public {
        hld.add(item);
    }
    function verifyMerkleRoot(uint256[2] memory a, uint256[2][2] memory b, uint256[2] memory c, uint256 depth, uint256 arity, uint256 root) public view returns (bool) {
        return hld.verifyMerkleRoot(a, b, c, depth, arity, root);
    }
}
