// SPDX-License-Identifier: AGPL-3.0-only
// ERC20 Extensions v1.1.2
pragma solidity ^0.8.0;

import "../../interfaces/IAutoSwap.sol";
import "../../interfaces/IUniswapV2Router.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

abstract contract AutoSwapUpgradeable is ERC20Upgradeable, IAutoSwap {
    address public WETH;
    address public uniswapPair;
    mapping(address => bool) public isExcludedFromFee;
    bool public feesEnabled;
    bool public swapEnabled;
    uint256 public swapFee;

    receive() external payable {
        // Do nothing
    }

    function __AutoSwap_init() internal onlyInitializing {
        // calculate future Uniswap V2 pair address
        address uniswapFactory = router().factory();
        address _WETH = router().WETH();
        WETH = _WETH;
        // calculate future uniswap pair address
        (address token0, address token1) = (_WETH < address(this) ? (_WETH, address(this)) : (address(this), _WETH));
        address pair = address(
            uint160(
                uint256(
                    keccak256(
                        abi.encodePacked(
                            hex"ff",
                            uniswapFactory,
                            keccak256(abi.encodePacked(token0, token1)),
                            (
                                block.chainid == 56
                                    ? hex"00fb7f630766e6a796048ea87d01acd3068e8ff67d078148a3fa3f4a84f69bd5"
                                    : hex"96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f"
                            )
                        )
                    )
                )
            )
        );
        uniswapPair = pair;
        _setExcludeFromFee(address(this), true);
    }

    function _transfer(address sender, address recipient, uint256 amount) internal override {
        // add liquidity
        // user => pair, msg.sender = router

        // remove liquidity
        // pair => router, msg.sender = pair
        // router => user, msg.sender = router

        // buy tokens for eth
        // pair => user, msg.sender = pair

        // sell tokens for eth
        // user => pair, msg.sender = router
        address pair = uniswapPair;
        // don't take a fee when
        // 1. fees are disabled
        // 2. the uniswap pair is neither sender nor recipient (non uniswap buy or sell)
        // 3. sender or recipient is excluded from fees
        // 4. sender is pair and recipient is router (2 transfers take place when liquidity is removed)
        if (
            !feesEnabled ||
            (sender != pair && recipient != pair) ||
            isExcludedFromFee[sender] ||
            isExcludedFromFee[recipient] ||
            (sender == pair && recipient == address(router()))
        ) {
            ERC20Upgradeable._transfer(sender, recipient, amount);
            return;
        }

        uint256 swapAmount = (amount * swapFee) / 10000;

        if (swapAmount > 0) {
            ERC20Upgradeable._transfer(sender, address(this), swapAmount);
            // don't autoswap when uniswap pair or router are sending tokens
            if (swapEnabled && sender != pair && sender != address(router())) {
                _swapTokensForEth(address(this));
            }
            _handleFeeTransfer();
        }

        ERC20Upgradeable._transfer(sender, recipient, amount - swapAmount);
    }

    function _swapTokensForEth(address to) internal virtual {
        uint256 tokenAmount = balanceOf(address(this));
        // only swap if more than 1e-5 tokens are in contract to avoid "UniswapV2: K" error
        if (tokenAmount > 10 ** 13) {
            address[] memory path = new address[](2);
            path[0] = address(this);
            path[1] = WETH;

            IUniswapV2Router _router = router();
            _approve(address(this), address(_router), tokenAmount);
            _router.swapExactTokensForETHSupportingFeeOnTransferTokens(tokenAmount, 0, path, to, block.timestamp);
        }
    }

    /// @dev called after the transfer fee has been sent to this contract
    /// @dev can be overridden to distribute the fee
    /// @dev should be used to distribute ETH and token fees (based on whether swap is enabled)
    function _handleFeeTransfer() internal virtual {}

    function router() public view virtual returns (IUniswapV2Router) {
        if (
            block.chainid == 1 || block.chainid == 3 || block.chainid == 4 || block.chainid == 5 || block.chainid == 42
        ) {
            // ethereum mainnet | ropsten | rinkeby | goerli | kovan
            return IUniswapV2Router(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);
        } else if (block.chainid == 137) {
            // polygon
            return IUniswapV2Router(0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff);
        } else if (block.chainid == 56) {
            // binance smart chain
            return IUniswapV2Router(0x10ED43C718714eb63d5aA57B78B54704E256024E);
        } else {
            revert("UNSUPPORTED_NETWORK");
        }
    }

    /**
     * @notice adds or removes an account that is exempt from fee collection
     * @param account account to modify
     * @param excluded new value
     */
    function _setExcludeFromFee(address account, bool excluded) internal virtual {
        isExcludedFromFee[account] = excluded;
        emit ExcludedFromFeeUpdated(account, excluded);
    }

    /**
     * @notice sets whether account collects fees on token transfer
     * @param enabled bool whether fees are enabled
     */
    function _setFeesEnabled(bool enabled) internal virtual {
        emit FeesEnabledUpdated(enabled);
        feesEnabled = enabled;
    }

    /**
     * @notice sets whether collected fees are autoswapped
     * @param enabled bool whether swap is enabled
     */
    function _setSwapEnabled(bool enabled) internal virtual {
        emit SwapEnabledUpdated(enabled);
        swapEnabled = enabled;
    }

    function _setSwapFee(uint256 newFee) internal virtual {
        require(newFee <= 10000, "MAX_FEE");
        emit SwapFeeUpdated(swapFee, newFee);
        swapFee = newFee;
    }

    uint256[50] private __gap;
}
