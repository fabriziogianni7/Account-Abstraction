import { ethers } from "hardhat";
import { ContractFactory, solidityPackedKeccak256 } from "ethers";
import { expect } from "chai";



type UserOperation = {
  to: string
  data: Uint8Array | string
  value: number
  gas: number
  nonce: number
  signature?: string
  // uint256 value; 
  // uint256 gas;
  // bytes signature;
  // uint256 nonce;
}

describe("step-1", () => {
  let wallet: any;
  let walletAddress: string;
  let owner: any;
  let accounts: any[];

  beforeEach(async () => {

    // Deploy the contract with an owner address
    accounts = await ethers.getSigners();
    // const WalletFactory: ContractFactory = new ethers.ContractFactory(
    //   walletArtifact.abi,
    //   walletArtifact.bytecode,
    //   accounts[2]
    // );

     const WalletFactory = await ethers.getContractFactory("Wallet");
    owner = accounts[0]; // Replace with the desired owner address
    wallet = await WalletFactory.deploy(owner);
    await wallet.waitForDeployment();
    walletAddress = await wallet.getAddress()

  });

  it("should deploy with the correct owner and nonce", async () => {
    // Retrieve the owner and nonce values from the deployed contract
    const retrievedOwner: string = await wallet.getOwner();
    const retrievedNonce: number = await wallet.getNonce();

    // Verify that the retrieved values match the expected values
    expect(wallet).is.not.null
    expect(retrievedNonce).equals(0n);
    expect(retrievedOwner).equals("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
  });

  it("test signature validation: owner send message with its signature", async () => {
    const encoder = new TextEncoder();

    const userOperation: UserOperation = {
      data: "abcdefghilmnopqrstuvz",
      to: accounts[1],
      gas: 10000,
      nonce: 1,
      value: 0
    }
    const messageHash = solidityPackedKeccak256(
      ["string", "string", "uint256", "uint256", "uint256"],
      [userOperation.data, userOperation.to, userOperation.gas, userOperation.nonce, userOperation.value]
    );

    const signature = await owner.signMessage(messageHash);
    userOperation.signature = signature
    userOperation.data = encoder.encode("abcdefghilmnopqrstuvz"),

      expect(signature).equals("0xc82ea7221f24cf9372bdbd9bd8f4fce1d3109b3074015a8119e5b631fa039d1916ab969aeb16187a4aca010f5be3feecaa9ed9bce6bf5235d6789389d93a9aed1c");

    await wallet.executeOp(userOperation)

    let nonce = await wallet.getNonce();
    expect(nonce).equals(1);
  });
});
