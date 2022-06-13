// SPDX-License-Identifier: AGPL-3.0-only
// ERC20 Extensions v1.1.1
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";

contract MockERC20 is ERC20Permit {
    constructor() ERC20("Test Token", "TST") ERC20Permit("Test Token") {
        _mint(msg.sender, 1000000 ether);
    }
}
