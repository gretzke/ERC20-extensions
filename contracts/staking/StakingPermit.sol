// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity 0.8.13;

import "@openzeppelin/contracts/token/ERC20/extensions/draft-IERC20Permit.sol";
import "./Staking.sol";

/// @notice see Staking.sol
/// @dev adds support for depositing tokens with permit if underlying token supports EIP2612
contract StakingPermit is Staking {
    constructor(
        string memory name,
        string memory symbol,
        address underlyingToken
    ) Staking(name, symbol, underlyingToken) {}

    /// @notice allows to deposit tokens without an approve transaction by using the EIP2612 permit standard
    /// @param amount amount of underlying token to deposit
    /// @param deadline until the signature is valid
    /// @param signature permit signature
    function depositWithPermit(
        uint256 amount,
        uint256 deadline,
        bytes memory signature
    ) external {
        require(signature.length == 65);
        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }

        IERC20Permit(address(token)).permit(_msgSender(), address(this), type(uint256).max, deadline, v, r, s);
        deposit(amount);
    }
}
