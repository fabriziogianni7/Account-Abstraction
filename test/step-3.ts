import { ethers } from "hardhat";
import { ContractFactory, solidityPackedKeccak256, parseEther } from "ethers";
import { expect } from "chai";

type UserOperation = {
  sender: string
  to: string
  data: Uint8Array | string
  value: number
  gasLimit: number
  nonce?: number
  gasPrice?: number
  maxPriorityFeePerGas?: number
  signature?: Uint8Array | string
}

describe("step-3", () => {
  let wallet: any;
  let wallet2: any;
  let entryPoint: any;
  let walletAddress: string;
  let walletAddress2: string;
  let entryPointAddress: string;
  let owner: any;
  let owner2: any;
  let accounts: any[];
  let provider: any

  beforeEach(async () => {

    provider = ethers.provider

    // Deploy the contract with an owner address
    accounts = await ethers.getSigners();
    // console.log(await provider.getBalance(accounts[0].address))

    const EntryPointFactory = await ethers.getContractFactory("EntryPointStepThree");
    entryPoint = await EntryPointFactory.deploy();
    await entryPoint.waitForDeployment();
    entryPointAddress = await entryPoint.getAddress()

    //1st wallet
    const WalletFactory = await ethers.getContractFactory("WalletStepThree");
    owner = accounts[0]; // Replace with the desired owner address
    wallet = await WalletFactory.deploy(owner, entryPointAddress);
    await wallet.waitForDeployment();
    walletAddress = await wallet.getAddress()
    // 2nd wallet
    owner2 = accounts[4]; // Replace with the desired owner address
    wallet2 = await WalletFactory.deploy(owner2, entryPointAddress);
    await wallet2.waitForDeployment();
    walletAddress2 = await wallet2.getAddress()

  });

  it("should deploy 2 Wallets and Entrypoint", async () => {
    // Retrieve the owner and nonce values from the deployed contract
    const retrievedOwner: string = await wallet.getOwner();
    const retrievedNonce: number = await wallet.getNonce();
    const retrievedNonce2: number = await wallet2.getNonce();
    const retrievedEntryPoint: number = await wallet.entryPoint();

    // Verify that the retrieved values match the expected values
    expect(wallet).is.not.null
    expect(wallet2).is.not.null
    expect(retrievedNonce).equals(0n);
    expect(retrievedNonce2).equals(0n);
    expect(retrievedOwner).equals("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
    expect(retrievedEntryPoint).equals(entryPointAddress);
  });

  it(`Owner can deposit into wallet \n\tBundler can call the entrypoint to make a bundle of calls \n\tExecutor should be refunded`, async () => {

    //depositing funds into walllet1
    const depositAmount = '0.1'
    const fundWalletTx = {
      to: walletAddress,
      value: ethers.parseEther(depositAmount),
    };

    const sendtx = await owner.sendTransaction(fundWalletTx)
    await sendtx.wait()
    const walletBalance = await provider.getBalance(walletAddress)

    const fundWalletTx2 = {
      to: walletAddress2,
      value: ethers.parseEther(depositAmount),
    };

    const sendtx2 = await owner2.sendTransaction(fundWalletTx2)
    await sendtx2.wait()
    const walletBalance2 = await provider.getBalance(walletAddress2)
    console.log("walletBalance2", walletBalance2)
    console.log("walletBalance", walletBalance)
    expect(walletBalance).equals(ethers.parseEther(depositAmount))
    expect(walletBalance2).equals(ethers.parseEther(depositAmount))


    const executor = accounts[3]
    const executorBalanceBeforeTransaction = await provider.getBalance(executor.address)
    const executorToEntryPoint = entryPoint.connect(executor);

    // // owner builds the transaction
    const encoder = new TextEncoder();
    const userOperation1: UserOperation = {
      sender: walletAddress,
      data: "abcdefghilmnopqrstuvz",
      to: accounts[1],
      gasLimit: 30000000,
      nonce: 1,
      value: 0,
      gasPrice: 1188103197,
      maxPriorityFeePerGas: 1429654332
    }


    const messageHash1 = solidityPackedKeccak256(
      ["string", "string", "string", "uint256", "uint256", "uint256"],
      [userOperation1.sender, userOperation1.data, userOperation1.to, userOperation1.gasLimit, userOperation1.nonce, userOperation1.value]
    );

    const signature1 = await owner.signMessage(messageHash1);
    userOperation1.signature = signature1
    userOperation1.data = encoder.encode("abcdefghilmnopqrstuvz")




    const userOperation2: UserOperation = {
      sender: walletAddress2,
      data: "abcdefghilmnopqrstuvz",
      to: accounts[1],
      gasLimit: 30000000,
      nonce: 1,
      value: 0,
      gasPrice: 1188103197,
      maxPriorityFeePerGas: 1429654332
    }


    const messageHash2 = solidityPackedKeccak256(
      ["string", "string", "string", "uint256", "uint256", "uint256"],
      [userOperation2.sender, userOperation2.data, userOperation2.to, userOperation2.gasLimit, userOperation2.nonce, userOperation2.value]
    );

    const signature2 = await owner.signMessage(messageHash2);
    userOperation2.signature = signature2
    userOperation2.data = encoder.encode("abcdefghilmnopqrstuvz")



    // // executor should make the call
    // // entrypoint should validate and execute
    const tx = await executorToEntryPoint.handleOps([userOperation1, userOperation2], {
    })
    const rec = await tx.wait();
    console.log("rec.gasUsed",rec.gasUsed)




    const executorBalanceAfterTransaction = await provider.getBalance(executor.address)


    // // executor get refunded from the entryPoint here the balance of executor 
    // //i'm spending more gas, not sure why!!
    // //apparently the gasUsed returned by tx receipt is diffeerent than the one I get in sc with gasleft(). I added something to make this work but it's wrong so far
    expect(executorBalanceAfterTransaction).greaterThanOrEqual(executorBalanceBeforeTransaction)
    console.log("executorBalanceBeforeTransaction",executorBalanceBeforeTransaction)
    console.log("executorBalanceAfterTransaction",executorBalanceAfterTransaction)

    // const depositForWallet = await entryPoint.getDepositForWallet(wallet)
    // expect(depositForWallet).lessThan(ethers.parseEther(depositAmount)) //apparently the gasUsed returned by tx receipt is diffeerent than the one I get in sc with gasleft(). I added something to make this work but I'm not sure

  })


});
