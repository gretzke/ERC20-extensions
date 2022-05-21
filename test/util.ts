import { Contract } from 'ethers';
import { ethers, upgrades } from 'hardhat';

require('dotenv').config();

const upgradeable = process.env.UPGRADEABLE === 'true';

export const contractName = (name: string) => name + (upgradeable ? 'Upgradeable' : '');

export const deploy = async (name: string, args: any[]): Promise<Contract> => {
  const factory = await ethers.getContractFactory(contractName(name));
  if (upgradeable) {
    return upgrades.deployProxy(factory, args);
  } else {
    return await factory.deploy(...args);
  }
};
