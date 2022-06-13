// SPDX-License-Identifier: AGPL-3.0-only
// ERC20 Extensions v1.1.1
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../staking/StakingPermitUpgradeable.sol";

contract MockStakingUpgradeable is StakingPermitUpgradeable, OwnableUpgradeable {
    bool transferable;

    function initialize(address _underlyingToken) external initializer {
        __Staking_init("Staked Test Token", "stTST", _underlyingToken);
        __Ownable_init();
        transferable = true;
    }

    function setTransferable(bool _transferable) external onlyOwner {
        transferable = _transferable;
    }

    function _isTransferable() internal view override returns (bool) {
        return transferable;
    }
}
