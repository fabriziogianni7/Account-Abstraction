// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

struct UserOperation {
    address sender;
    address to;
    bytes data;
    uint256 value;
    uint256 gasLimit;
    bytes signature;
    uint256 nonce;
    uint256 maxPriorityFeePerGas;
    address paymaster;
    bytes paymasterData;
}
