require('dotenv').config();
import { BigNumber } from '@ethersproject/bignumber';
import { ContractTransaction } from '@ethersproject/contracts';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  IERC20,
  IERC20__factory,
  IUniswapV2Router,
  IUniswapV2Router__factory,
  MockAutoSwapUpgradeable,
} from '../typechain-types';
import { contractName, deploy } from './util';

describe(contractName('AutoSwap'), () => {
  let erc20: MockAutoSwapUpgradeable;
  let uniswap: IUniswapV2Router;
  let accounts: SignerWithAddress[];
  const unix2100 = '4102441200';
  let owner: string;
  let beneficiary: string;

  before(async () => {
    accounts = await ethers.getSigners();
    owner = accounts[0].address;
    beneficiary = accounts[2].address;
    erc20 = (await deploy('MockAutoSwap', [beneficiary])) as MockAutoSwapUpgradeable;
  });

  describe('Setup tests', async () => {
    it('should be able to add liquidity', async () => {
      const uniswapRouter = await erc20.router();
      await erc20.approve(uniswapRouter, ethers.constants.MaxUint256);
      uniswap = IUniswapV2Router__factory.connect(uniswapRouter, accounts[0]);
      await uniswap.addLiquidityETH(
        erc20.address,
        ethers.utils.parseEther('1000000'),
        ethers.utils.parseEther('1000000'),
        ethers.utils.parseEther('20'),
        owner,
        unix2100,
        { value: ethers.utils.parseEther('20') }
      );
    });
  });

  describe('Function tests', async () => {
    describe('Set fees enabled', async () => {
      it('should be able to enable fees', async () => {
        await expect(erc20.setFeesEnabled(true)).to.emit(erc20, 'FeesEnabledUpdated').withArgs(true);
        expect(await erc20.feesEnabled()).to.be.true;
      });
      it('only owner can enable fees', async () => {
        await expect(erc20.connect(accounts[1]).setFeesEnabled(false)).to.be.reverted;
      });
    });

    describe('Set swap enabled', async () => {
      it('should be able to enable swap', async () => {
        await expect(erc20.setSwapEnabled(true)).to.emit(erc20, 'SwapEnabledUpdated').withArgs(true);
        expect(await erc20.swapEnabled()).to.be.true;
      });
      it('only owner can enable fees', async () => {
        await expect(erc20.connect(accounts[1]).setSwapEnabled(false)).to.be.reverted;
      });
    });

    describe('Set excluded from fees', async () => {
      it('be able to exclude accounts from fees', async () => {
        expect(await erc20.isExcludedFromFee(accounts[5].address)).to.be.false;
        await expect(erc20.setExcludeFromFee(accounts[5].address, true))
          .to.emit(erc20, 'ExcludedFromFeeUpdated')
          .withArgs(accounts[5].address, true);
        expect(await erc20.isExcludedFromFee(accounts[5].address)).to.be.true;
      });
      it('only owner should be able to exclude accounts from fees', async () => {
        await expect(erc20.connect(accounts[1]).setExcludeFromFee(accounts[5].address, true)).to.be.reverted;
      });
    });

    describe('Set autoswap fee', async () => {
      it('should be able to update fee', async () => {
        expect(await erc20.swapFee()).to.equal(0);
        await expect(erc20.setSwapFee(500)).to.emit(erc20, 'SwapFeeUpdated').withArgs(0, 500);
        expect(await erc20.swapFee()).to.equal(500);
      });
      it('fee cannot exceed 100%', async () => {
        await expect(erc20.setSwapFee(10001)).to.be.revertedWith('MAX_FEE');
      });
    });
  });

  describe('Uniswap tests & transfer tests', async () => {
    let weth: IERC20;

    before(async () => {
      weth = IERC20__factory.connect(await erc20.WETH(), accounts[0]);
    });

    it('should not take a fee on wallet to wallet transfer', async () => {
      const tx = erc20.transfer(accounts[1].address, ethers.utils.parseEther('1000000'));
      await expect(tx)
        .to.emit(erc20, 'Transfer')
        .withArgs(owner, accounts[1].address, ethers.utils.parseEther('1000000'));
      await expect(tx).to.not.emit(weth, 'Transfer');
    });

    describe('uniswap sell', async () => {
      let balance: BigNumber;
      const amount = ethers.utils.parseEther('1000');
      const fee = amount.div(20);
      let tx: ContractTransaction;

      before(async () => {
        balance = await erc20.provider.getBalance(beneficiary);
        tx = await uniswap.swapExactTokensForETHSupportingFeeOnTransferTokens(
          amount,
          '0',
          [erc20.address, weth.address],
          accounts[0].address,
          unix2100
        );
      });

      it('should transfer amount minus fee to uniswap', async () => {
        await expect(tx)
          .to.emit(erc20, 'Transfer')
          .withArgs(owner, await erc20.uniswapPair(), amount.sub(fee));
      });
      it('should transfer fee to uniswap', async () => {
        await expect(tx)
          .to.emit(erc20, 'Transfer')
          .withArgs(erc20.address, await erc20.uniswapPair(), fee);
      });
      it('should pay out ETH rewards to beneficiary', async () => {
        expect((await erc20.provider.getBalance(beneficiary)).gt(balance)).to.be.true;
      });
    });

    describe('uniswap buy', async () => {
      const amount = ethers.utils.parseEther('1000');
      const fee = amount.div(20);
      let tx: ContractTransaction;

      before(async () => {
        tx = await uniswap.swapETHForExactTokens(amount, [weth.address, erc20.address], accounts[0].address, unix2100, {
          value: ethers.utils.parseEther('20'),
        });
      });

      it('should transfer amount minus fee from uniswap', async () => {
        await expect(tx)
          .to.emit(erc20, 'Transfer')
          .withArgs(await erc20.uniswapPair(), owner, amount.sub(fee));
      });
      it('should transfer fee to token contract', async () => {
        await expect(tx)
          .to.emit(erc20, 'Transfer')
          .withArgs(await erc20.uniswapPair(), erc20.address, fee);
      });
    });
  });
});
