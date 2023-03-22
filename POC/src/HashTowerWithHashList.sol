// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

//import "./HashTowerWithHashListH20W4Verifier.sol";
contract Poseidon2 {
    function poseidon(uint256[2] memory) public pure returns (uint256) {}
}
Poseidon2 constant P2 = Poseidon2(0x1111111122222222333333334444444400000002);

// capacity = W * (W**0 + W**1 + ... + W**(H - 1)) = W * (W**H - 1) / (W - 1)
// 4 * (4^0 + 4^1 + 4^2 + ... 4^19) = 1_466_015_503_700
uint8 constant H = 20;
uint8 constant W = 4;
uint256 constant CAPACITY = 1_466_015_503_700; // https://github.com/ethereum/solidity/issues/13724

uint256 constant SNARK_SCALAR_FIELD =
    21888242871839275222246405745257275088548364400416034343698204186575808495617;


contract HashTowerWithHashList {
    //HashTowerWithHashListH20W4Verifier private immutable verifier = new HashTowerWithHashListH20W4Verifier();
    uint64 private _count;
    uint256[H] private D;
    uint256[H] private DD;

    event Add(uint8 indexed level, uint64 indexed lvFullIndex, uint256 value); // TODO: merge fields

    function add(uint256 toAdd) public {
        require(toAdd < SNARK_SCALAR_FIELD, "HashTowerWithHashList: toAdd must be < SNARK_SCALAR_FIELD");

        uint64 count = _count;
        require(count < CAPACITY, "HashTowerWithHashList: full");

        uint64 z;
        uint64 fl;
        uint8 ll; // TODO: or just uint256 ?
        uint8 lv;
        //uint64 powWLv = 1; // powWLv = W ** lv // TODO

        // find the lowest level that has space
        for (; true; lv++) {
            z += W ** lv;
            fl = (count < z) ? 0 : (count - z) / W ** lv + 1;
            ll = uint8((fl == 0) ? 0 : (fl - 1) % W + 1);
            if (ll < W) break;
        }
        // append and go downward
        uint256 v = (lv > 0) ? D[lv - 1] : toAdd;
        emit Add(lv, fl, v);
        uint256 d = (ll == 0) ? v : P2.poseidon([D[lv], v]);
        uint256 dd = (fl == ll) ? d : P2.poseidon([DD[lv + 1], d]); // fl == ll means there is no level above
        uint256 prevDd;
        while (true) {
            D[lv] = d;
            DD[lv] = dd;
            if (lv == 0) break;
            z -= W ** lv;
            prevDd = dd;
            lv--;
            // the rest levels are all full
            fl = (count - z) / W ** lv + 1;
            v = (lv > 0) ? D[lv - 1] : toAdd;
            emit Add(lv, fl, v);  // emit event
            d = v;
            dd = P2.poseidon([prevDd, d]);
        }
        _count = count + 1;
    }

    function getCountAndDd() public view returns (uint64, uint256) {
        return (_count, DD[0]);
    }
    /*
    function prove(uint[2] memory a, uint[2][2] memory b, uint[2] memory c) external view returns (bool) {
        uint256[1] memory pub;
        pub[0] = dd;
        return verifier.verifyProof(a, b, c, pub);
    }
    */
}
