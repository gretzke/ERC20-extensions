require('dotenv').config();
import { ethers } from 'hardhat';
import { expect } from 'chai';
import { MockERC20, Staking } from '../typechain-types/';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

describe('Staking', () => {
  let staking: Staking;
  let erc20: MockERC20;
  let accounts: SignerWithAddress[];
  let owner: SignerWithAddress;
  const amount = ethers.utils.parseEther('1000');

  before(async () => {
    accounts = await ethers.getSigners();
    owner = accounts[0];
    const tokenFactory = await ethers.getContractFactory('MockERC20');
    erc20 = (await tokenFactory.deploy()) as MockERC20;
    const stakingFactory = await ethers.getContractFactory('Staking');
    staking = (await stakingFactory.deploy('Staked Test Token', 'sTST', erc20.address)) as Staking;
    await erc20.transfer(accounts[1].address, amount);
    await erc20.transfer(accounts[2].address, amount);
    await erc20.transfer(accounts[3].address, amount.mul(2));
  });

  describe('Setup tests', async () => {
    it('should not be able to receive rewards if no tokens are staked', async () => {
      expect(owner.sendTransaction({ to: staking.address, value: '1' })).to.be.revertedWith('NO_TOKENS_STAKED');
    });

    it('token balance should return zero if no tokens are staked', async () => {
      expect(await staking.tokenBalance(accounts[0].address)).to.eq(0);
    });
  });

  describe('Stake', async () => {
    it('should stake tokens successfully', async () => {
      await erc20.approve(staking.address, amount);
      const tx = staking.deposit(amount);
      await expect(tx).to.emit(staking, 'Deposit').withArgs(accounts[0].address, amount, amount);
      expect(await erc20.balanceOf(staking.address)).to.equal(amount);
      expect(await staking.balanceOf(accounts[0].address)).to.equal(amount);
      expect(await staking.totalSupply()).to.equal(amount);
      expect(await staking.tokenBalance(accounts[0].address)).to.equal(amount);
    });

    it('should mint new tokens proportionally to staked tokens', async () => {
      await erc20.connect(accounts[1]).approve(staking.address, amount);
      const tx = staking.connect(accounts[1]).deposit(amount);
      await expect(tx).to.emit(staking, 'Deposit').withArgs(accounts[1].address, amount, amount);
      expect(await erc20.balanceOf(staking.address)).to.equal(amount.mul(2));
      expect(await staking.balanceOf(accounts[1].address)).to.equal(amount);
      expect(await staking.totalSupply()).to.equal(amount.mul(2));
      expect(await staking.tokenBalance(accounts[1].address)).to.equal(amount);
    });
    it('should be able to stake more tokens', async () => {
      await erc20.approve(staking.address, amount.mul(2));
      const tx = staking.deposit(amount.mul(2));
      await expect(tx).to.emit(staking, 'Deposit').withArgs(accounts[0].address, amount.mul(2), amount.mul(2));
      expect(await erc20.balanceOf(staking.address)).to.equal(amount.mul(4));
      expect(await staking.balanceOf(accounts[0].address)).to.equal(amount.mul(3));
      expect(await staking.totalSupply()).to.equal(amount.mul(4));
      expect(await staking.tokenBalance(accounts[0].address)).to.equal(amount.mul(3));
    });
  });
  describe('Rewards', async () => {
    it('should reflect withdrawable balance accurately after rewards have been sent to contract', async () => {
      await erc20.transfer(staking.address, amount.mul(4));
      expect(await erc20.balanceOf(staking.address)).to.equal(amount.mul(8));
      expect(await staking.tokenBalance(accounts[0].address)).to.equal(amount.mul(6));
      expect(await staking.tokenBalance(accounts[1].address)).to.equal(amount.mul(2));
    });
    it('should mint less staked tokens on deposit after rewards have been paid out', async () => {
      await erc20.connect(accounts[2]).approve(staking.address, amount);
      const tx = staking.connect(accounts[2]).deposit(amount);
      await expect(tx).to.emit(staking, 'Deposit').withArgs(accounts[2].address, amount, amount.div(2));
      expect(await erc20.balanceOf(staking.address)).to.equal(amount.mul(9));
      expect(await staking.balanceOf(accounts[2].address)).to.equal(amount.div(2));
      expect(await staking.totalSupply()).to.equal(amount.mul(45).div(10));
      expect(await staking.tokenBalance(accounts[2].address)).to.equal(amount);
    });
    it('should still reflect withdrawable balance accurately after rewards have been sent to contract', async () => {
      await erc20.transfer(staking.address, amount.mul(9));
      expect(await staking.tokenBalance(accounts[0].address)).to.equal(amount.mul(12));
      expect(await staking.tokenBalance(accounts[1].address)).to.equal(amount.mul(4));
      expect(await staking.tokenBalance(accounts[2].address)).to.equal(amount.mul(2));
    });
  });
  describe('Unstake', async () => {
    before(async () => {
      await erc20.connect(accounts[3]).approve(staking.address, amount.mul(2));
      await staking.connect(accounts[3]).deposit(amount.mul(2));
    });
    it('should be able to unstake tokens', async () => {
      const tx = staking.withdraw(amount, false);
      await expect(tx).to.emit(staking, 'Withdraw').withArgs(accounts[0].address, amount.mul(4), amount);
      await expect(tx).to.emit(erc20, 'Transfer').withArgs(staking.address, accounts[0].address, amount.mul(4));
      expect(await erc20.balanceOf(staking.address)).to.equal(amount.mul(16));
      expect(await staking.balanceOf(accounts[0].address)).to.equal(amount.mul(2));
      expect(await staking.totalSupply()).to.equal(amount.mul(4));
      expect(await staking.tokenBalance(accounts[0].address)).to.equal(amount.mul(8));
    });
  });
  describe('Rewards in ETH', async () => {
    before(async () => {
      await erc20.transfer(accounts[4].address, amount.mul(10));
      await erc20.connect(accounts[0]).approve(staking.address, ethers.constants.MaxUint256);
      await erc20.connect(accounts[1]).approve(staking.address, ethers.constants.MaxUint256);
      await erc20.connect(accounts[2]).approve(staking.address, ethers.constants.MaxUint256);
      await erc20.connect(accounts[3]).approve(staking.address, ethers.constants.MaxUint256);
      await erc20.connect(accounts[4]).approve(staking.address, ethers.constants.MaxUint256);
    });
    // accounts and balances
    // 0: 2000 => 8000
    // 1: 1000 => 4000
    // 2:  500 => 2000
    // 3:  500 => 2000
    let claimable = ['0', '0', '0', '0'];
    let claimed = ['0', '0', '0', '0'];
    let total = ['0', '0', '0', '0'];
    const checkRewards = async () => {
      for (let i = 0; i < claimable.length; i++) {
        try {
          expect(await staking.claimableRewardsOf(accounts[i].address)).to.equal(ethers.utils.parseEther(claimable[i]));
        } catch (e) {
          console.error('claimable', i);
          throw e;
        }
        try {
          expect(await staking.claimedRewards(accounts[i].address)).to.equal(ethers.utils.parseEther(claimed[i]));
        } catch (e) {
          console.error('claimable', i);
          throw e;
        }
        try {
          expect(await staking.totalRewardsEarned(accounts[i].address)).to.equal(ethers.utils.parseEther(total[i]));
        } catch (e) {
          console.error('total', i);
          throw e;
        }
      }
    };

    it('should not have any rewards to claim', async () => {
      await checkRewards();
    });

    it("should not emit any rewards if there aren't any to claim", async () => {
      const tx = staking.claimRewards(accounts[0].address);
      await expect(tx).to.not.emit(staking, 'RewardClaimed');
    });

    it('should not emit RewardsReceived event if no value sent to contract', async () => {
      const tx = owner.sendTransaction({ to: staking.address, value: 0 });
      await expect(tx).to.not.emit(staking, 'RewardsReceived');
    });

    it('should distribute rewards correctly', async () => {
      const ethAmount = ethers.utils.parseEther('1');
      const tx = owner.sendTransaction({ to: staking.address, value: ethAmount });
      await expect(tx).to.emit(staking, 'RewardsReceived').withArgs(owner.address, ethAmount);
      claimable = ['0.5', '0.25', '0.125', '0.125'];
      total = ['0.5', '0.25', '0.125', '0.125'];
      await checkRewards();
    });

    it('should be able to claim rewards', async () => {
      const tx = staking.claimRewards(owner.address);
      await expect(tx)
        .to.emit(staking, 'RewardClaimed')
        .withArgs(owner.address, owner.address, ethers.utils.parseEther('0.5'));
      claimable[0] = '0';
      claimed[0] = '0.5';
      await checkRewards();
    });

    it('should not change balance when unstaking tokens', async () => {
      await staking.connect(accounts[3]).withdraw(amount.div(2), false);
      await staking.connect(accounts[1]).withdraw(amount.div(2), false);
      await checkRewards();
    });

    it('unstaked participants should not receive full rewards', async () => {
      const ethAmount = ethers.utils.parseEther('3');
      await owner.sendTransaction({ to: staking.address, value: ethAmount });
      claimable = ['2', '0.75', '0.625', '0.125'];
      total = ['2.5', '0.75', '0.625', '0.125'];
      await checkRewards();
    });

    it('should be able to claim rewards after unstaking completely', async () => {
      await staking.connect(accounts[3]).claimRewards(owner.address);
      claimable[3] = '0';
      claimed[3] = '0.125';
      await checkRewards();
    });

    it('minting should not increase rewards balance', async () => {
      await staking.connect(accounts[1]).deposit(amount.mul(2));
      await staking.connect(accounts[4]).deposit(amount.mul(2));
      claimable.push('0');
      claimed.push('0');
      total.push('0');
      await checkRewards();
    });

    it('transferring tokens should keep rewards', async () => {
      const ethAmount = ethers.utils.parseEther('1');
      await owner.sendTransaction({ to: staking.address, value: ethAmount });
      claimable = ['2.5', '1', '0.75', '0', '0.125'];
      total = ['3', '1', '0.75', '0.125', '0.125'];
      await checkRewards();
      const tx = await staking.connect(accounts[4]).transfer(accounts[3].address, amount.div(2));
      await expect(tx).to.emit(staking, 'Transfer').withArgs(accounts[4].address, accounts[3].address, amount.div(2));
      await checkRewards();
    });

    it('should be able to claim rewards to another account', async () => {
      const tx = staking.connect(accounts[4]).claimRewards(accounts[3].address);
      await expect(tx)
        .to.emit(staking, 'RewardClaimed')
        .withArgs(accounts[4].address, accounts[3].address, ethers.utils.parseEther('0.125'));
      claimable[4] = '0';
      claimed[4] = '0.125';
      await checkRewards();
    });
    it('should fail if recipient of claimed rewards cannot receive payment', async () => {
      await expect(staking.claimRewards(erc20.address)).to.be.revertedWith('ETH_TRANSFER_FAILED');
    });
    it('should distribute small amounts of rewards correctly', async () => {
      await owner.sendTransaction({ to: staking.address, value: 8 });
      expect(await staking.claimableRewardsOf(accounts[0].address)).to.equal(
        ethers.utils.parseEther(claimable[0]).add('4')
      );
      expect(await staking.totalRewardsEarned(accounts[0].address)).to.equal(
        ethers.utils.parseEther(total[0]).add('4')
      );
      expect(await staking.claimableRewardsOf(accounts[1].address)).to.equal(
        ethers.utils.parseEther(claimable[1]).add('2')
      );
      expect(await staking.totalRewardsEarned(accounts[1].address)).to.equal(
        ethers.utils.parseEther(total[1]).add('2')
      );
      expect(await staking.claimableRewardsOf(accounts[2].address)).to.equal(
        ethers.utils.parseEther(claimable[2]).add('1')
      );
      expect(await staking.totalRewardsEarned(accounts[2].address)).to.equal(
        ethers.utils.parseEther(total[2]).add('1')
      );
      expect(await staking.claimableRewardsOf(accounts[3].address)).to.equal(
        ethers.utils.parseEther(claimable[3]).add('1')
      );
      expect(await staking.totalRewardsEarned(accounts[3].address)).to.equal(
        ethers.utils.parseEther(total[3]).add('1')
      );
    });
    it('should be able to claim rewards on withdrawal', async () => {
      const balance = await ethers.provider.getBalance(accounts[3].address);
      const claimableRewards = await staking.claimableRewardsOf(accounts[3].address);
      const tx = await staking
        .connect(accounts[3])
        .withdraw(await staking.balanceOf(accounts[3].address), true, { gasPrice: 0 });
      await expect(tx)
        .to.emit(staking, 'RewardClaimed')
        .withArgs(accounts[3].address, accounts[3].address, claimableRewards);
      expect(balance.add(claimableRewards)).to.equal(await ethers.provider.getBalance(accounts[3].address));
    });
  });
});
