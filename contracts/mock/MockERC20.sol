// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity 0.8.13;

import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";

contract MockERC20 is ERC20Permit {
    constructor() ERC20("Test Token", "TST") ERC20Permit("Test Token") {
        _mint(msg.sender, 1000000 ether);
    }
}
