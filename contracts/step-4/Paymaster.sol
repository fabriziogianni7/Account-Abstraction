// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

/**
READ THIS!
this if from "Goal: No separate EOA" to "Simulation redux" 
*/

import "./UserOperation.sol";

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract Paymaster {
    using ECDSA for bytes32;
    using SafeMath for uint256;


/**
@notice
 look at UserOperation and decide if sponsor the transaction or not
  */
    function validatePaymasterOp(UserOperation memory op) public{}
}
