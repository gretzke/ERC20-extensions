require('dotenv').config();
import { ethers } from 'hardhat';
import { expect } from 'chai';
import { MockERC20, StakingPermit } from '../typechain-types';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { contractName, deploy } from './util';

describe(contractName('StakingPermit'), () => {
  let staking: StakingPermit;
  let erc20: MockERC20;
  let accounts: SignerWithAddress[];
  const unix2100 = '4102441200';
  const amount = ethers.utils.parseEther('1000');
  let domain: {
    name: string;
    version: string;
    chainId: string;
    verifyingContract: string;
  };

  before(async () => {
    accounts = await ethers.getSigners();
    erc20 = (await deploy('MockERC20', [])) as MockERC20;
    staking = (await deploy('StakingPermit', ['Staked Test Token', 'sTST', erc20.address])) as StakingPermit;

    domain = {
      name: 'Test Token',
      version: '1',
      chainId: (await ethers.provider.getNetwork()).chainId.toString(),
      verifyingContract: erc20.address,
    };
    await erc20.transfer(accounts[0].address, amount);
  });

  describe('Stake with permit', async () => {
    let signature: string;
    before(async () => {
      const types = {
        Permit: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
      };
      const values = {
        owner: accounts[0].address,
        spender: staking.address,
        value: ethers.constants.MaxUint256,
        nonce: await erc20.nonces(accounts[0].address),
        deadline: unix2100,
      };
      signature = await accounts[0]._signTypedData(domain, types, values);
    });

    it('should fail if invalid signature length provided', async () => {
      await expect(staking.depositWithPermit('1', unix2100, [])).to.be.reverted;
    });

    it('should be able to stake with permit', async () => {
      const tx = staking.connect(accounts[0]).depositWithPermit(amount, unix2100, signature);
      await expect(tx).to.emit(staking, 'Deposit').withArgs(accounts[0].address, amount, amount);
      expect(await erc20.balanceOf(staking.address)).to.equal(amount);
      expect(await staking.balanceOf(accounts[0].address)).to.equal(amount);
      expect(await staking.totalSupply()).to.equal(amount);
      expect(await staking.tokenBalance(accounts[0].address)).to.equal(amount);
    });
  });
});
