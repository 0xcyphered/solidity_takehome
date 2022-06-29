import { expect } from "chai";
import moment from "moment";
import { ethers, waffle } from "hardhat";
import { MockProvider } from "ethereum-waffle";
import { ERC20 } from "../typechain/ERC20";
import { ERC20__factory } from "../typechain/factories/ERC20__factory";
import { Vault } from "../typechain/Vault";
import { Vault__factory } from "../typechain/factories/Vault__factory";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";

const { provider } = waffle;

async function increaseBlockTimestamp(provider: MockProvider, time: number) {
  await provider.send("evm_increaseTime", [time]);
  await provider.send("evm_mine", []);
};

describe("vault", function () {

  let token: ERC20;
  let vault: Vault;
  const [wallet] = provider.getWallets();
  let signers: SignerWithAddress[];

  before(async function () {
    signers = await ethers.getSigners();
    const deployer = new ERC20__factory(signers[0]);
    token = await deployer.deploy("token", "TKN");
    await token.mint(signers[0].address, ethers.utils.parseEther("100"));

    const vaultDeployer = new Vault__factory(signers[0]);
    vault = await vaultDeployer.deploy();


    // const VaultFactory = await ethers.getContractFactory('Vault', signers[0]);
    // await VaultFactory.deploy();
  });


  describe("Add Grant", async () => {
    let firstUnlockTime = moment().add(1, 'day');

    it("add successfully", async () => {
      await token.approve(vault.address, ethers.utils.parseEther("5"));
      const tx = await vault.addGrant(token.address, signers[1].address, ethers.utils.parseEther("5"), firstUnlockTime.unix());

      expect(tx)
        .to.emit(vault, "GrantAdded")
        .withArgs(token.address, signers[1].address, ethers.utils.parseEther("5"), firstUnlockTime.unix());

    });

    it("change lock time successfully", async () => {
      const unlockTime = moment().add(6, 'hours')
      const tx = await vault.decreaseLockTime(signers[1].address, unlockTime.unix());

      expect(tx)
        .to.emit(vault, "GrantUnlockChanged")
        .withArgs(signers[1].address, firstUnlockTime.unix(), unlockTime.unix());

    });

    it("add multiple grant to same recipient is not allowed", async () => {
      const unlockTime = moment().add(1, 'day')
      const tx = vault.addGrant(token.address, signers[1].address, ethers.utils.parseEther("10"), unlockTime.unix());

      await expect(tx)
        .to.be.reverted;

    });

    it("remove successfully", async () => {
      const unlockTime = moment().add(1, 'day')
      const tx = await vault.removeGrant(signers[1].address);

      expect(tx)
        .to.emit(vault, "GrantRemoved")
        .withArgs(signers[1].address);

    });

    it("claim successfully", async () => {
      const unlockTime = moment().add(1, 'day')
      await token.approve(vault.address, ethers.utils.parseEther("10"));
      await vault.addGrant(token.address, signers[1].address, ethers.utils.parseEther("5"), unlockTime.unix());
      await increaseBlockTimestamp(provider, unlockTime.unix());
      const tx = await vault.connect(signers[1]).claimGrant(signers[0].address);

      expect(tx)
        .to.emit(vault, "GrantClaimed")
        .withArgs(signers[0].address, token.address, ethers.utils.parseEther("5"));

    });
  });
});