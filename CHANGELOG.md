# Change Log

All notable changes to this project will be documented in this file.

# v1.1.1

## (2022-06-13)

### Fixes

- Make autoswap contract abstract
- All contracts now default to the standard ERC20 interface (EIP 2612 support can be added manually)
- Add version comment to source code files

# v1.1.0

## (2022-06-09)

### Features

- Staking transferability: Added `_isTransferable()` function to enable / disable transferability of the overlying token
- Vesting whitelist: In some scenarios it might be useful to be able to transfer vested tokens to certain addresses ignoring the vesting schedule (e.g., depositing vested tokens into a governance contract). When the tokens are returned to the wallet, the tokens continue to be vested.

# v1.0.1

## (2022-05-25)

### Fixes

- Add Github repo to npm page

# v1.0.0

## (2022-05-22)

### Features

- Staking contract
  - Stake underlying token
  - Receive rewards in underlying token and ETH
- ERC20 Vesting contract
- Autoswap ERC20 token
  - Take a fee on a UniSwap V2 buy / sell (or QuickSwap on Polygon or PancakeSwap on BSC) and sell it for ETH / MATIC / BNB
  - Swapped fee can be distributed
