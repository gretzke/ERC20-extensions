import '@nomiclabs/hardhat-etherscan';
import '@nomiclabs/hardhat-waffle';
import '@openzeppelin/hardhat-upgrades';
import '@primitivefi/hardhat-marmite';
import '@typechain/hardhat';
import * as dotenv from 'dotenv';
import 'hardhat-gas-reporter';
import { HardhatUserConfig, task } from 'hardhat/config';
import 'solidity-coverage';

dotenv.config();

const upgradeable = process.env.UPGRADEABLE === 'true';

const hardhatConfig = {
  gasPrice: 0,
  hardfork: 'berlin',
  forking: {
    url: 'https://mainnet.infura.io/v3/' + process.env.INFURA_TOKEN,
  },
  chainId: 1,
};

const baseConfig: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: hardhatConfig,
  },
  solidity: {
    compilers: [
      {
        version: '0.8.14',
        settings: {
          optimizer: {
            enabled: true,
            runs: 10000,
          },
        },
      },
    ],
  },
  gasReporter: {
    currency: 'USD',
    gasPrice: 100,
    enabled: process.env.REPORT_GAS === 'true',
    excludeContracts: [],
  },
  paths: {
    sources: upgradeable ? './contracts-upgradeable' : './contracts',
  },
  mocha: {
    timeout: 100000,
  },
};

const config: HardhatUserConfig = {
  ...baseConfig,
  networks:
    process.env.ENV === 'dev'
      ? {
          ...baseConfig.networks,
          rinkeby: {
            url: 'https://rinkeby.infura.io/v3/' + process.env.INFURA_TOKEN,
            accounts: {
              mnemonic: process.env.MNEMONIC as string,
            },
          },
        }
      : baseConfig.networks,
  etherscan:
    process.env.ENV === 'dev'
      ? {
          apiKey: process.env.ETHERSCAN_TOKEN,
        }
      : {},
};

task('accounts', 'Prints the list of accounts', async (args, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(await account.address);
  }
});

export default config;
