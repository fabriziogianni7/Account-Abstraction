// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

/**
 READ THIS!
 that's the first step where we are creating a wallet with an owner and a nonce
 executeOp validate the transaction and make the transaction call.
 this is the implementation of https://www.alchemy.com/blog/account-abstraction until "Goal: No separate EOA"
    */

import "./UserOperation.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract Wallet {
    using ECDSA for bytes32;

    uint256 private nonce;
    address private owner;

    event SignatureValid(bool);

    constructor(address _owner) {
        owner = _owner;
    }

    function getNonce() public view returns (uint256) {
        return nonce;
    }

    function getOwner() public view returns (address) {
        return owner;
    }

    function executeOp(UserOperation calldata userOp) public  {
        //should validate the signature
        bytes32 userOpHash = _getHash(userOp);
        bool isSignatureValid = _validateSignature(userOp, userOpHash);
       

        //should make the request in the userOp calling basically eth_sendTransaction
        if (isSignatureValid) {
            _call(userOp.to, userOp.value, userOp.data);
            nonce += 1;
        }
    }

    function _validateSignature(
        UserOperation calldata userOp,
        bytes32 userOpHash
    ) internal view returns (bool isValid) {
        bytes32 hash = userOpHash.toEthSignedMessageHash();
        if (owner != hash.recover(userOp.signature)) {
            isValid= false;
        }
        isValid= true;
        return isValid;
    }

    function _call(address target, uint256 value, bytes memory data) internal {
        //  emit SignatureValid(true);
    }

    function _getHash(
        UserOperation calldata userOp
    ) internal pure returns (bytes32 messageHash) {
        messageHash = keccak256(
            abi.encode(
                userOp.data,
                userOp.value,
                userOp.gas,
                userOp.signature,
                userOp.nonce
            )
        );
        return messageHash;
    }
}
