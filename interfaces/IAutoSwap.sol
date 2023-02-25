// SPDX-License-Identifier: AGPL-3.0-only
// ERC20 Extensions v1.1.2
pragma solidity ^0.8.0;

interface IAutoSwap {
    event FeesEnabledUpdated(bool enabled);
    event SwapEnabledUpdated(bool enabled);
    event ExcludedFromFeeUpdated(address account, bool excluded);
    event SwapFeeUpdated(uint256 oldFee, uint256 newFee);

    function WETH() external view returns (address);

    function uniswapPair() external view returns (address);

    function isExcludedFromFee(address account) external view returns (bool);

    function feesEnabled() external view returns (bool);

    function swapEnabled() external view returns (bool);
}
