// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity 0.8.13;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

struct VestingPeriod {
    uint256 cliffTimestamp;
    uint256 cliffAmount; // in myriad
    uint256 duration;
}

struct VestedBalance {
    uint256 vestingId;
    uint256 amount; // in wei
}

/// @title Vesting functionality for ERC20 tokens
/// @author Daniel Gretzke
/// @notice allows to set up multiple vesting schedules for token holders supporting a cliff + vesting schedule
/// @notice if an account is vested the smart contract ensures that the account has a minimum balance according to the vesting schedule, sending more tokens reverts the transaction
/// @notice every vesting schedule has a dedicated vesting admin, if this admin transfers tokens to an account, the vesting schedule is set up for the amount of sent tokens automatically
/// @dev setting the cliff amount to n% unlocks n% of tokens after the cliff timestamp, 100% - n% of tokens are unlocked gradually over the `duration`
/// @dev setting the cliff timestamp to the current timestamp starts the vesting period immediately
/// @dev setting duration to zero will unlock the full amount after the cliff timestamp
abstract contract VestedToken is ERC20 {
    uint256 private _vestingCounter;
    mapping(uint256 => VestingPeriod) public vestingPeriods;
    mapping(address => uint256) public vestingAdmins;
    mapping(address => VestedBalance) public vestedBalances;

    event VestingScheduleAdded(uint256 indexed vestingId, uint256 cliff, uint256 cliffAmount, uint256 duration);
    event VestedTokens(uint256 indexed vestingId, address indexed account, uint256 amount);

    /// @notice calculates the amount of locked tokens (minimum balance) for a given account
    function lockedTokens(address account) public view returns (uint256) {
        VestedBalance storage vestingBalance = vestedBalances[account];
        uint256 id = vestingBalance.vestingId;
        uint256 amount = vestingBalance.amount;
        if (id == 0) return 0;

        VestingPeriod storage vestingPeriod = vestingPeriods[id];
        uint256 cliffTimestamp = vestingPeriod.cliffTimestamp;
        uint256 duration = vestingPeriod.duration;
        if (cliffTimestamp > block.timestamp) return amount;
        if (block.timestamp >= cliffTimestamp + duration) return 0;

        uint256 cliffAmount = (amount * (10000 - vestingPeriod.cliffAmount)) / 10000;
        uint256 vestedAmount = (cliffAmount * (block.timestamp - cliffTimestamp)) / duration;
        return cliffAmount - vestedAmount;
    }

    function _setupSchedule(
        uint256 cliff,
        uint256 cliffAmount,
        uint256 duration,
        address vestingAdmin
    ) internal {
        require(cliffAmount <= 10000, "MAX_CLIFF");
        uint256 vestingId = ++_vestingCounter;
        vestingPeriods[vestingId] = VestingPeriod(cliff, cliffAmount, duration);
        require(vestingAdmins[vestingAdmin] == 0, "VESTING_ADMIN_ALREADY_SET");
        vestingAdmins[vestingAdmin] = vestingId;
        emit VestingScheduleAdded(vestingId, cliff, cliffAmount, duration);
    }

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        VestedBalance storage vestingBalance = vestedBalances[to];
        uint256 id = vestingAdmins[from];
        if (id != 0) {
            // if sender is vesting admin, setup vesting balance for receiving address
            require(vestingBalance.vestingId == 0, "USER_ALREADY_VESTED");
            vestingBalance.vestingId = id;
            vestingBalance.amount = amount;
            emit VestedTokens(id, to, amount);
        } else {
            require(balanceOf(from) >= lockedTokens(from), "TOKENS_VESTED");
        }
    }
}
