// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/draft-ERC20PermitUpgradeable.sol";

contract MockERC20Upgradeable is ERC20PermitUpgradeable {
    function initialize() external initializer {
        __ERC20_init("Test Token", "TST");
        __ERC20Permit_init("Test Token");
        _mint(msg.sender, 1000000 ether);
    }
}
