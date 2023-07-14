// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

struct UserOperation {
    address to;
    bytes data;
    uint256 value; 
    uint256 gas;
    bytes signature;
    uint256 nonce;
}
