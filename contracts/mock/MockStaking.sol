// SPDX-License-Identifier: AGPL-3.0-only
// ERC20 Extensions v1.1.1
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../staking/StakingPermit.sol";

contract MockStaking is StakingPermit, Ownable {
    bool transferable;

    constructor(address _underlyingToken) StakingPermit("Staked Test Token", "stTST", _underlyingToken) {
        transferable = true;
    }

    function setTransferable(bool _transferable) external onlyOwner {
        transferable = _transferable;
    }

    function _isTransferable() internal view override returns (bool) {
        return transferable;
    }
}
