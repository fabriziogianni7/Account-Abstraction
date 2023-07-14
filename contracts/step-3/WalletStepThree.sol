// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

/**
READ THIS!
this if from "Goal: No separate EOA" to "Simulation redux" 
*/

import "./UserOperation.sol";
import "./EntryPointStepThree.sol";

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract WalletStepThree {
    using ECDSA for bytes32;
    using SafeMath for uint256;

    uint256 private nonce;
    address private owner;
    address payable public immutable entryPoint;

    event Validation(bool);
    event OpExecuted(address indexed wallet);
    event Received(address, uint256);

    constructor(address _owner, address payable _entryPoint) {
        owner = _owner;
        entryPoint = _entryPoint;
    }

    modifier onlyEntryPoint() {
        require(msg.sender == entryPoint);
        _;
    }

    function getNonce() public view returns (uint256) {
        return nonce;
    }

    function getOwner() public view returns (address) {
        return owner;
    }

    function validateOp(
        UserOperation calldata userOp,
        uint256 missingAmount
    ) public onlyEntryPoint returns (uint256) {
        //this won't validate the opcodes
        // validate the signature
        uint256 startGas = gasleft();
        bytes32 userOpHash = _getHash(userOp);
        bool isSignatureValid = _validateSignature(userOp, userOpHash);
        //TODO send necessay funds for execution otherwise revert
        emit Validation(isSignatureValid);
        if (missingAmount > 0) {
            _fundEntryPoint(missingAmount);
        }

        return startGas - gasleft();
    }

    function executeOp(
        UserOperation calldata userOp
    ) public onlyEntryPoint returns (uint256) {
        //should make the request in the userOp calling basically eth_sendTransaction
        uint256 startGas = gasleft();

        _call(userOp.to, userOp.value, userOp.data);
        nonce.add(1);
        emit OpExecuted(address(this));

        return startGas - gasleft();
    }

    function _validateSignature(
        UserOperation calldata userOp,
        bytes32 userOpHash
    ) internal view returns (bool isValid) {
        bytes32 hash = userOpHash.toEthSignedMessageHash();
        if (owner != hash.recover(userOp.signature)) {
            isValid = false;
        }
        isValid = true;
        return isValid;
    }

    function _call(
        address target,
        uint256 value,
        bytes memory data
    ) internal returns (bool) {
        return true;
    }

    function _getHash(
        UserOperation calldata userOp
    ) internal pure returns (bytes32 messageHash) {
        messageHash = keccak256(
            abi.encode(
                userOp.data,
                userOp.value,
                userOp.gasLimit,
                userOp.signature,
                userOp.nonce
            )
        );
        return messageHash;
    }

    function _fundEntryPoint(uint256 amount) internal {
        require(address(this).balance > amount, "missing funds");
        // console.log("amount", amount);
        EntryPointStepThree(entryPoint).deposit{value: amount}(address(this));
    }

    function getFundBack() public {
        require(msg.sender == owner, "not authorized to make this call");
        EntryPointStepThree(entryPoint).withdrawTo(payable(address(this)));
    }
    //fallback
    receive() external payable {
        emit Received(msg.sender, msg.value);
    }
}
