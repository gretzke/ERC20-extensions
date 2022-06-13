// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.0;

import "../autoswap/AutoSwapUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract MockAutoSwapUpgradeable is AutoSwapUpgradeable, OwnableUpgradeable {
    address beneficiary;

    function initialize(address _beneficiary) external initializer {
        __Ownable_init();
        __ERC20_init("Test Token", "TST");
        __AutoSwap_init();
        _mint(_msgSender(), 1000000000 ether);
        beneficiary = _beneficiary;
    }

    function _handleFeeTransfer() internal override {
        uint256 amount = address(this).balance;
        (bool success, ) = beneficiary.call{value: amount}("");
        assert(success);
    }

    function setExcludeFromFee(address account, bool excluded) external onlyOwner {
        _setExcludeFromFee(account, excluded);
    }

    function setFeesEnabled(bool enabled) external onlyOwner {
        _setFeesEnabled(enabled);
    }

    function setSwapEnabled(bool enabled) external onlyOwner {
        _setSwapEnabled(enabled);
    }

    function setSwapFee(uint256 newFee) external onlyOwner {
        _setSwapFee(newFee);
    }
}
