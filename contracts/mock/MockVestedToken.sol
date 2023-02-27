// SPDX-License-Identifier: AGPL-3.0-only
// ERC20 Extensions v1.1.3
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../vesting/VestedToken.sol";

contract MockVestedToken is VestedToken, Ownable {
    constructor() ERC20("Test Token", "TST") {
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

    function whitelistRecipient(address recipient) external onlyOwner {
        recipientWhitelist[recipient] = true;
    }
}
