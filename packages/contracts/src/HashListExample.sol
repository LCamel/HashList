// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "./HashList.sol";

contract HashListExample4 {
    using HashList4 for HashListData4;
    HashListData4 hld;
    function add(uint item) public {
        hld.add(item);
    }
}
