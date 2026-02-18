// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IRWAAdapter} from "./interfaces/IRWAAdapter.sol";


contract RWAAdapter is IRWAAdapter, Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;



    address public immutable override usdc;
    address public immutable override vault; 
    address public arenaManager;

 
    mapping(uint256 => uint256) private _poolShares;
    mapping(uint256 => uint256) private _poolDeposited;

    constructor(address _usdc, address _vault, address _initialOwner) Ownable(_initialOwner) {
        usdc = _usdc;
        vault = _vault;
    }
    modifier onlyArenaManager() {
        if (msg.sender != arenaManager) revert OnlyArenaManager();
        _;
    }

    function setArenaManager(address _arenaManager) external onlyOwner {
        arenaManager = _arenaManager;
    }

    function deposit(uint256 poolId, uint256 amount) external override onlyArenaManager nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (_poolDeposited[poolId] != 0) revert PoolAlreadyDeposited(poolId);

        _poolDeposited[poolId] = amount;

        if (vault == address(0)) {
            _poolShares[poolId] = amount;
        } else {
            IERC20(usdc).approve(vault, amount);
            uint256 shares = IERC4626(vault).deposit(amount, address(this));
            _poolShares[poolId] = shares;
        }

        emit Deposited(poolId, amount, _poolShares[poolId]);
    }

    function withdraw(uint256 poolId, address recipient)
        external
        override
        onlyArenaManager
        nonReentrant
        returns (uint256 usdcReturned)
    {
        uint256 shares = _poolShares[poolId];
        if (shares == 0) revert PoolNotDeposited(poolId);

        _poolShares[poolId] = 0;
        _poolDeposited[poolId] = 0;

        if (vault == address(0)) {
            usdcReturned = shares;
            IERC20(usdc).safeTransfer(recipient, usdcReturned);
        } else {
            usdcReturned = IERC4626(vault).redeem(shares, recipient, address(this));
        }

        emit Withdrawn(poolId, usdcReturned, shares);
    }

    function currentValue(uint256 poolId) external view override returns (uint256) {
        uint256 shares = _poolShares[poolId];
        if (shares == 0) return 0;
        if (vault == address(0)) return shares; 
        return IERC4626(vault).convertToAssets(shares);
    }
    function yieldAccrued(uint256 poolId) external view override returns (uint256) {
        uint256 shares = _poolShares[poolId];
        if (shares == 0) return 0;
        uint256 deposited = _poolDeposited[poolId];
        if (vault == address(0)) return 0;
        uint256 current = IERC4626(vault).convertToAssets(shares);
        return current > deposited ? current - deposited : 0;
    }
}
