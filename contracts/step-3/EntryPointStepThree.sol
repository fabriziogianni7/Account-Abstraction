// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;
import "./UserOperation.sol";
import "./WalletStepThree.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "hardhat/console.sol";

contract EntryPointStepThree {
    using SafeMath for uint256;
    //keep track of deposit of each wallet
    mapping(address => uint256) public deposits;
    uint256 testNu = 0;

    event ExecutorRefunded(address indexed executor, uint256 amount);
    event Received(address, uint256);

    constructor() {}

    /**
    check to see if wallet has enough funds
    call executeOp on wallet
    send eth to executor to pay gas
    so in this case, the wallet need to deposit funds here to pay for the transactions.
     */

    function handleOp(UserOperation calldata op) public {
        uint256 baseFee = 2100;
        uint256 gasPrice = tx.gasprice;
        uint256 totalGas;
        WalletStepThree wallet = WalletStepThree(payable(op.sender));

        // //check to see if wallet has enough funds
        // //Set aside ETH from the wallet’s deposit to pay for the maximum amount of gas it might possibly use (based on the op's gas field). If the wallet doesn’t have enough, reject.
        uint256 walletBalance = op.sender.balance;
        uint256 depos = deposits[op.sender];
        uint256 missingAmount = 0;
        if (depos.add(walletBalance) < op.gasLimit) {
            revert("wallet does not have enough funds/deposit!");
        } else if (depos <= op.gasLimit) {
            missingAmount = (op.gasLimit.sub(depos)).mul(gasPrice);
        }

        // call validateOp
        uint256 validationGas = wallet.validateOp(op, missingAmount);
        uint256 executionGas = wallet.executeOp(op);

        totalGas =
            op.gasLimit +
            executionGas +
            validationGas +
            baseFee -
            gasleft();
        _refundExecutor(totalGas.mul(gasPrice), op.sender);
    }

    function deposit(address wallet) public payable {
        deposits[wallet] += msg.value;
    }

    //need to be improved
    function withdrawTo(address payable destination) public {
        require(msg.sender == destination, "msg sender is not authorized");
        require(deposits[destination]>0, "destination wallet has no funds here");
        (bool success, ) = payable(msg.sender).call{
            value: deposits[destination]
        }("");
        require(success, "Transfer back to wallet failed");
    }

    function getDepositForWallet(address wallet) public view returns (uint256) {
        return deposits[wallet];
    }

    function _refundExecutor(
        uint256 amountToRefund,
        address wallet
    ) internal virtual {
        if (amountToRefund != 0) {
            // console.log("amountToRefund", amountToRefund);
            (bool success, ) = payable(msg.sender).call{value: amountToRefund}(
                ""
            );
            require(success, "Transfer to executor failed");
            deposits[wallet] -= amountToRefund;
        }
    }
}
