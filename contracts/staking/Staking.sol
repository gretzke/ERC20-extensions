// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity 0.8.13;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {SafeMathInt, SafeMathUint} from "../lib/SafeMath.sol";

/// @title Staking contract for ERC20 tokens
/// @author Daniel Gretzke
/// @notice Allows users to stake an underlying ERC20 token and receive a new ERC20 token in return which tracks their stake in the pool
/// @notice Rewards in form of the underlying ERC20 token are distributed proportionally across all staking participants
/// @notice Rewards in ETH are distributed proportionally across all staking participants
contract Staking is ERC20 {
    using SafeMathUint for uint256;
    using SafeMathInt for int256;

    uint256 private constant MAX_UINT256 = type(uint256).max;
    // allows to distribute small amounts of ETH correctly
    uint256 private constant MAGNITUDE = 10**40;

    IERC20 token;
    uint256 private _magnifiedRewardPerShare;
    mapping(address => int256) private _magnifiedRewardCorrections;
    mapping(address => uint256) public claimedRewards;

    event RewardsReceived(address indexed from, uint256 amount);
    event Deposit(address indexed user, uint256 underlyingToken, uint256 overlyingToken);
    event Withdraw(address indexed user, uint256 underlyingToken, uint256 overlyingToken);
    event RewardClaimed(address indexed user, address indexed to, uint256 amount);

    constructor(
        string memory name,
        string memory symbol,
        address underlyingToken
    ) ERC20(name, symbol) {
        token = IERC20(underlyingToken);
    }

    /// @notice when the smart contract receives ETH, register payment
    /// @dev can only receive ETH when tokens are staked
    receive() external payable {
        require(totalSupply() > 0, "NO_TOKENS_STAKED");
        if (msg.value > 0) {
            _magnifiedRewardPerShare += (msg.value * MAGNITUDE) / totalSupply();
            emit RewardsReceived(_msgSender(), msg.value);
        }
    }

    /// @notice allows to deposit the underlying token into the staking contract
    /// @dev mints an amount of overlying tokens according to the stake in the pool
    /// @param amount amount of underlying token to deposit
    function deposit(uint256 amount) public {
        uint256 share = 0;
        if (totalSupply() > 0) {
            share = (totalSupply() * amount) / token.balanceOf(address(this));
        } else {
            share = amount;
        }
        token.transferFrom(_msgSender(), address(this), amount);
        _mint(_msgSender(), share);
        emit Deposit(_msgSender(), amount, share);
    }

    /// @notice allows to withdraw the underlying token from the staking contract
    /// @param amount of overlying tokens to withdraw
    /// @param claim whether or not to claim ETH rewards
    /// @return amount of underlying tokens withdrawn
    function withdraw(uint256 amount, bool claim) external returns (uint256) {
        if (claim) {
            claimRewards(_msgSender());
        }
        uint256 withdrawnTokens = (amount * token.balanceOf(address(this))) / totalSupply();
        _burn(_msgSender(), amount);
        token.transfer(_msgSender(), withdrawnTokens);
        emit Withdraw(_msgSender(), withdrawnTokens, amount);
        return withdrawnTokens;
    }

    /// @notice allows to claim accumulated ETH rewards
    /// @param to address to send rewards to
    function claimRewards(address to) public {
        uint256 claimableRewards = claimableRewardsOf(_msgSender());
        if (claimableRewards > 0) {
            claimedRewards[_msgSender()] += claimableRewards;
            (bool success, ) = to.call{value: claimableRewards}("");
            require(success, "ETH_TRANSFER_FAILED");
            emit RewardClaimed(_msgSender(), to, claimableRewards);
        }
    }

    /// @dev on mint, burn and transfer adjust corrections so that ETH rewards don't change on these events
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        super._beforeTokenTransfer(from, to, amount);

        if (from == address(0)) {
            // mint
            _magnifiedRewardCorrections[to] -= (_magnifiedRewardPerShare * amount).toInt256Safe();
        } else if (to == address(0)) {
            // burn
            _magnifiedRewardCorrections[from] += (_magnifiedRewardPerShare * amount).toInt256Safe();
        } else {
            // transfer
            int256 magnifiedCorrection = (_magnifiedRewardPerShare * amount).toInt256Safe();
            _magnifiedRewardCorrections[from] += (magnifiedCorrection);
            _magnifiedRewardCorrections[to] -= (magnifiedCorrection);
        }
    }

    /// @return accumulated underlying token balance that can be withdrawn by the user
    function tokenBalance(address user) public view returns (uint256) {
        if (totalSupply() == 0) {
            return 0;
        }
        return (balanceOf(user) * token.balanceOf(address(this))) / totalSupply();
    }

    /// @return total amount of ETH rewards earned by user
    function totalRewardsEarned(address user) public view returns (uint256) {
        int256 magnifiedRewards = (_magnifiedRewardPerShare * balanceOf(user)).toInt256Safe();
        uint256 correctedRewards = (magnifiedRewards + _magnifiedRewardCorrections[user]).toUint256Safe();
        return correctedRewards / MAGNITUDE;
    }

    /// @return amount of ETH rewards that can be claimed by user
    function claimableRewardsOf(address user) public view returns (uint256) {
        return totalRewardsEarned(user) - claimedRewards[user];
    }
}
