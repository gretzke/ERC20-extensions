# ERC20 Extensions

[![CI Status](https://github.com/gretzke/ERC20-extensions/actions/workflows/tests.yml/badge.svg)](https://github.com/gretzke/ERC20-extensions/actions)
[![npm](https://img.shields.io/npm/v/erc20-extensions.svg)](https://www.npmjs.com/package/erc20-extensions)
[![Downloads](https://img.shields.io/npm/dt/erc20-extensions.svg)](https://www.npmjs.com/package/erc20-extensions)
[![License](https://img.shields.io/badge/License-AGPLv3-green.svg)](https://www.gnu.org/licenses/agpl-3.0)

This repository provides useful extensions to ERC20 tokens such as vesting, autoswap fees with UniSwap V2 or staking contracts.

## Build and Test

On the project root, run:

```
$ npm i                         # install dependencies
$ npm run compile               # compile contracts and generate typechain
$ npm run compile:upgradeable   # compile contracts and generate typechain for upgradeable contracts
$ npm test                      # run tests
$ npm test:upgradeable          # run tests for upgradeable contracts
```

optional:

```
$ npm run coverage              # run test coverage tool
$ npm run coverage:upgradeable  # run test coverage tool for upgradeable contracts
```

## Licensing

The primary license for the smart contracts is the GNU Affero General Public License v3.0, see [`LICENSE`](./LICENSE).

## Disclaimer

_These smart contracts are being provided as is. No guarantee, representation or warranty is being made, express or implied, as to the safety or correctness of the smart contracts._
