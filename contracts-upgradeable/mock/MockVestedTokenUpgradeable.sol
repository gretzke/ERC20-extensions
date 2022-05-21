// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../vesting/VestedTokenUpgradeable.sol";

contract MockVestedTokenUpgradeable is VestedTokenUpgradeable, OwnableUpgradeable {
    function initialize() external initializer {
        __ERC20_init("Test Token", "TST");
        __Ownable_init();
        _mint(msg.sender, 1000000 ether);
    }

    function setupVestingSchedule(
        uint256 cliff,
        uint256 cliffAmount,
        uint256 duration,
        address vestingAdmin
    ) external onlyOwner {
        _setupSchedule(cliff, cliffAmount, duration, vestingAdmin);
    }
}
