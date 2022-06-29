import { expect } from "chai";
import { ethers, waffle } from "hardhat";
import { ERC20 } from "../typechain/ERC20";
import { ERC20__factory } from "../typechain/factories/ERC20__factory";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";

const { provider } = waffle;

describe("erc20", function () {
  let token: ERC20;
  const [wallet] = provider.getWallets();
  let signers: SignerWithAddress[];

  before(async function () {
    signers = await ethers.getSigners();
    const deployer = new ERC20__factory(signers[0]);
    token = await deployer.deploy("token", "TKN");
    await token.mint(signers[0].address, ethers.utils.parseEther("100"));
  });


  describe("transfer functionality", async () => {

    it("transfers successfully", async () => {
      await token.transfer(signers[1].address, ethers.utils.parseEther("5"));
      expect(await token.balanceOf(signers[0].address)).to.be.eq(
        ethers.utils.parseEther("95")
      );
      expect(await token.balanceOf(signers[1].address)).to.be.eq(
        ethers.utils.parseEther("5")
      );
    });

    it("does not transfer more than balance", async () => {
      const tx = token.transfer(
        signers[1].address,
        ethers.utils.parseEther("500")
      );
      await expect(tx).to.be.revertedWith("ERC20: insufficient-balance");
    });

  });

  describe("transferFrom functionality", async () => {

    it("approves successfully", async () => {
      const amount = ethers.utils.parseEther("5")
      const approveTx = await token.approve(signers[1].address, amount);
      const allowance = await token.allowance(
        signers[0].address,
        signers[1].address,
      );
      expect(allowance.toString()).to.equal(amount);
    });

    it("transfers successfully", async () => {

      const amount = ethers.utils.parseEther("5")
      const priorBalance0 = await token.balanceOf(signers[0].address);
      const priorBalance1 = await token.balanceOf(signers[1].address);
      await token.approve(signers[1].address, amount);
      await token.connect(signers[1]).transferFrom(signers[0].address, signers[1].address, amount);
      expect(await token.balanceOf(signers[0].address)).to.be.eq(
        priorBalance0.sub(amount)
      );
      expect(await token.balanceOf(signers[1].address)).to.be.eq(
        priorBalance1.add(amount)
      );

    });

    it("does not transfer more than balance", async () => {
      const amount = ethers.utils.parseEther("5")
      await token.approve(signers[1].address, amount);
      const tx = token.connect(signers[1]).transferFrom(signers[0].address, signers[1].address, amount.mul(2));
      await expect(tx).to.be.revertedWith("ERC20: insufficient-allowance")

    });
  });

});
