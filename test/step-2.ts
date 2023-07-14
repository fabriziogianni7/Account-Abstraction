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

describe("step-2", () => {
  let wallet: any;
  let entryPoint: any;
  let walletAddress: string;
  let entryPointAddress: string;
  let owner: any;
  let accounts: any[];
  let provider: any

  beforeEach(async () => {

    provider = ethers.provider

    // Deploy the contract with an owner address
    accounts = await ethers.getSigners();
    // console.log(await provider.getBalance(accounts[0].address))

    const EntryPointFactory = await ethers.getContractFactory("EntryPoint");
    entryPoint = await EntryPointFactory.deploy();
    await entryPoint.waitForDeployment();
    entryPointAddress = await entryPoint.getAddress()

    const WalletFactory = await ethers.getContractFactory("WalletStepTwo");
    owner = accounts[0]; // Replace with the desired owner address
    wallet = await WalletFactory.deploy(owner, entryPointAddress);
    await wallet.waitForDeployment();
    walletAddress = await wallet.getAddress()

  });

  it("should deploy Wallet and Entrypoint", async () => {
    // Retrieve the owner and nonce values from the deployed contract
    const retrievedOwner: string = await wallet.getOwner();
    const retrievedNonce: number = await wallet.getNonce();
    const retrievedEntryPoint: number = await wallet.entryPoint();

    // Verify that the retrieved values match the expected values
    expect(wallet).is.not.null
    expect(retrievedNonce).equals(0n);
    expect(retrievedOwner).equals("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
    expect(retrievedEntryPoint).equals(entryPointAddress);
  });

  //should: 
  // owner of wallet can deposit funds in the entrypoint
  // an executor can call the entrypoint to make a call and should be refunded
  it("owner of wallet can deposit funds in the entrypoint", async () => {
    const ownerToEntryPoint = entryPoint.connect(owner);
    const ownerBalance = await provider.getBalance(accounts[0].address)
    const depositAmount = '0.1'
    const tx = await ownerToEntryPoint.deposit(walletAddress, {
      value: ethers.parseEther(depositAmount),
    });

    const rc = await tx.wait();

    const deposit = await entryPoint.getDepositForWallet(walletAddress)

    expect(deposit).equals(BigInt(parseFloat(depositAmount) * 1000000000000000000))


  })
  it(`Executor can call the entrypoint to make a call \n\tExecutor should be refunded \n\tWallet pay with its own funds`, async () => {

    //depositing funds into walllet
    const depositAmount = '0.1'
    const fundWalletTx = {
      to: walletAddress,
      value: ethers.parseEther(depositAmount),
    };

    const sendtx = await owner.sendTransaction(fundWalletTx)
    await sendtx.wait()
    const walletBalance = await provider.getBalance(walletAddress)

    expect(walletBalance).equals(ethers.parseEther(depositAmount))


    const executor = accounts[3]

    const executorToEntryPoint = entryPoint.connect(executor);

    // owner builds the transaction
    const encoder = new TextEncoder();
    const userOperation: UserOperation = {
      sender: walletAddress,
      data: "abcdefghilmnopqrstuvz",
      to: accounts[1],
      gasLimit: 30000000,
      nonce: 1,
      value: 0,
      gasPrice: 1188103197,
      maxPriorityFeePerGas: 1429654332
    }
    const messageHash = solidityPackedKeccak256(
      ["string", "string", "string", "uint256", "uint256", "uint256"],
      [userOperation.sender, userOperation.data, userOperation.to, userOperation.gasLimit, userOperation.nonce, userOperation.value]
    );

    const signature = await owner.signMessage(messageHash);
    userOperation.signature = signature
    userOperation.data = encoder.encode("abcdefghilmnopqrstuvz")

    const executorBalanceBeforeTransaction = await provider.getBalance(executor.address)

    // executor should make the call
    // entrypoint should validate and execute
    const tx = await executorToEntryPoint.handleOp(userOperation, {
      gasLimit: userOperation.gasLimit
    })



    const rec = await tx.wait();

    const executorBalanceAfterTransaction = await provider.getBalance(executor.address)


    // executor get refunded from the entryPoint here the balance of executor 
    //i'm spending more gas, not sure why!!
    //apparently the gasUsed returned by tx receipt is diffeerent than the one I get in sc with gasleft(). I added something to make this work but it's wrong so far
    expect(executorBalanceAfterTransaction).greaterThanOrEqual(executorBalanceBeforeTransaction)

    const depositForWallet = await entryPoint.getDepositForWallet(wallet)
    expect(depositForWallet).lessThan(ethers.parseEther(depositAmount)) //apparently the gasUsed returned by tx receipt is diffeerent than the one I get in sc with gasleft(). I added something to make this work but I'm not sure

  })


  // it("test signature validation: owner send message with its signature", async () => {
  //   const encoder = new TextEncoder();

  //   const userOperation: UserOperation = {
  //     data: "abcdefghilmnopqrstuvz",
  //     to: accounts[1],
  //     gas: 10000,
  //     nonce: 1,
  //     value: 0
  //   }
  //   const messageHash = solidityPackedKeccak256(
  //     ["string", "string", "uint256", "uint256", "uint256"],
  //     [userOperation.data, userOperation.to, userOperation.gas, userOperation.nonce, userOperation.value]
  //   );

  //   const signature = await owner.signMessage(messageHash);
  //   userOperation.signature = signature
  //   userOperation.data = encoder.encode("abcdefghilmnopqrstuvz"),

  //     expect(signature).equals("0xc82ea7221f24cf9372bdbd9bd8f4fce1d3109b3074015a8119e5b631fa039d1916ab969aeb16187a4aca010f5be3feecaa9ed9bce6bf5235d6789389d93a9aed1c");

  //   await wallet.executeOp(userOperation)

  //   let nonce = await wallet.getNonce();
  //   expect(nonce).equals(1);
  // });
});
