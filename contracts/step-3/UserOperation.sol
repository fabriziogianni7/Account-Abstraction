// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

struct UserOperation {
    address sender;
    address to;
    bytes data;
    uint256 value; 
    uint256 gasLimit;
    uint256 maxPriorityFeePerGas;
    uint256 gasPrice;
    uint256 nonce;
    bytes signature;
}
