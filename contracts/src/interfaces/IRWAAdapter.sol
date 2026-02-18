// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IRWAAdapter
/// @notice Interface for the yied integration layer.
///         ArenaManager deposits prize pool USDC here; the adapter routes it
///         into an ERC4626-compatible RWA vault and redeems on game completion.
interface IRWAAdapter {
    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event Deposited(uint256 indexed poolId, uint256 usdcAmount, uint256 sharesReceived);
    event Withdrawn(uint256 indexed poolId, uint256 usdcReturned, uint256 sharesRedeemed);

    // -------------------------------------------------------------------------
    // Custom Errors
    // -------------------------------------------------------------------------

    error OnlyArenaManager();
    error PoolAlreadyDeposited(uint256 poolId);
    error PoolNotDeposited(uint256 poolId);
    error ZeroAmount();

    // -------------------------------------------------------------------------
    // State-Changing
    // -------------------------------------------------------------------------

    /// @notice Deposit `amount` USDC on behalf of `poolId`.
    ///         Caller must have already transferred USDC to this contract, OR
    ///         this contract must be approved to pull from ArenaManager.
    /// @dev    Only callable by ArenaManager.
    function deposit(uint256 poolId, uint256 amount) external;

    /// @notice Redeem all shares for `poolId` and return USDC to `recipient`.
    /// @dev    Only callable by ArenaManager.
    /// @return usdcReturned  Total USDC (principal + yield) sent to recipient
    function withdraw(uint256 poolId, address recipient) external returns (uint256 usdcReturned);

    // -------------------------------------------------------------------------
    // Views
    // -------------------------------------------------------------------------

    /// @notice Current USDC value of `poolId`'s position (principal + yield).
    function currentValue(uint256 poolId) external view returns (uint256);

    /// @notice Yield accrued since deposit for `poolId`.
    function yieldAccrued(uint256 poolId) external view returns (uint256);

    /// @notice Underlying ERC4626 vault address.
    function vault() external view returns (address);

    /// @notice USDC token address.
    function usdc() external view returns (address);
}
