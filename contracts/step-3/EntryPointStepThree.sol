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
        address[] memory senders = new address[](1);
        senders[0] = op.sender;

        _refundExecutor(totalGas.mul(gasPrice), senders);
    }

    function handleOps(UserOperation[] calldata ops) public {
        uint256 startGas = gasleft();
        uint256 initialGasSpent= 30000000- startGas;
        //for each op: validate all and make a list with all the succesfully vlidated ops
        //take this list and call execute ops an all of the ops
        UserOperation[] memory validatedUserOps = new UserOperation[](
            ops.length
        );
        address[] memory senders = new address[](ops.length);

        uint256 gasPrice = tx.gasprice;
        uint256 totalGas;
        uint256 totalGasLimit;
        for (uint256 i; i < ops.length; i++) {
            UserOperation memory op = ops[i];
            WalletStepThree wallet = WalletStepThree(payable(op.sender));
            uint256 walletBalance = op.sender.balance;
            uint256 depos = deposits[op.sender];
            uint256 missingAmount = 0;
            if (depos.add(walletBalance) < op.gasLimit) {
                continue;
            } else if (depos <= op.gasLimit) {
                missingAmount = (op.gasLimit.sub(depos)).mul(gasPrice);
            }

            // call validateOp
            uint256 validationGas = wallet.validateOp(op, missingAmount);
            validatedUserOps[i] = op;
            totalGas += validationGas;
        }

        //execute
        for (uint256 i; i < validatedUserOps.length; i++) {
            UserOperation memory op = validatedUserOps[i];
            WalletStepThree wallet = WalletStepThree(payable(op.sender));
            uint256 executionGas = wallet.executeOp(op);
            validatedUserOps[i] = op;
            totalGas += executionGas;
            senders[i] = op.sender;
            totalGasLimit += op.gasLimit;
        }
        uint256 finalGas = startGas +initialGasSpent - gasleft() + 21000 ;


        _refundExecutor(finalGas.mul(gasPrice), senders); //change to accept array of wallets
    }

    function deposit(address wallet) public payable {
        deposits[wallet] += msg.value;
    }

    //need to be improved
    function withdrawTo(address payable destination) public {
        require(msg.sender == destination, "msg sender is not authorized");
        require(
            deposits[destination] > 0,
            "destination wallet has no funds here"
        );
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
        address[] memory wallets
    ) internal virtual {
        if (amountToRefund != 0) {
            (bool success, ) = payable(msg.sender).call{value: amountToRefund}(
                ""
            );
            require(success, "Transfer to bundler failed");
            for (uint256 i; i < wallets.length; i++) {
                address wallet = wallets[i];
                // deposits[wallet] -= amountToRefund;
            }
        }
    }
}
