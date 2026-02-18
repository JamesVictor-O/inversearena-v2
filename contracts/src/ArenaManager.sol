// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IArenaManager} from "./interfaces/IArenaManager.sol";
import {IRWAAdapter} from "./interfaces/IRWAAdapter.sol";
import {ArenaVRF} from "./ArenaVRF.sol";

/// @title ArenaManager
/// @notice Core game logic for Inverse Arena.
///
///         Game Rules
///         ----------
///         1. Host creates a pool, setting entry fee, player cap, and round duration.
///         2. Players join by depositing USDC.  All funds flow into RWAAdapter.
///         3. Each round, players submit Heads or Tails.
///            - Non-submitters default to HEADS.
///            - The *minority* choice survives; the majority is eliminated.
///            - On a tie (equal counts) everyone survives.
///         4. Last player standing wins the full prize pool (principal + yield).
///         5. Eliminated players earn nothing (zero-sum design for now).
///
///         Creator Stake
///         -------------
///         - To create pools, a user must first deposit >= MIN_CREATOR_STAKE (4 USDC).
///         - This stake is global (not per-pool) and persists across pool creations.
///         - Withdraw is allowed only when the creator has zero active pools
///           (PENDING/ACTIVE/RESOLVING). Withdrawing with active pools slashes the
///           stake to the protocol owner.
///
///         Security
///         ---------
///         - ReentrancyGuard on all state-changing external calls.
///         - pull-over-push: winner calls claimWinnings(), no automatic transfers.
///         - Ownable2Step for admin operations (via ArenaVRF base).
///         - All arithmetic is checked (Solidity 0.8+).
contract ArenaManager is IArenaManager, ArenaVRF, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant MAX_ENTRY_FEE   = 100_000 * 1e6;
    uint256 public constant MIN_ENTRY_FEE   = 0.003e6;
    uint32  public constant MAX_PLAYERS_CAP = 1_000;
    uint32  public constant MIN_PLAYERS_MIN = 2;
    uint32  public constant MIN_ROUND_DURATION = 60;           // 1 minute
    uint32  public constant MAX_ROUND_DURATION = 7 days;
    uint256 public constant MIN_CREATOR_STAKE  = 4e6;          // 4 USDC

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    address public immutable override usdc;
    address public immutable override rwaAdapter;

    uint256 private _poolCount;

    mapping(uint256 => PoolConfig) private _configs;
    mapping(uint256 => PoolState)  private _states;

    /// poolId → player address → PlayerInfo
    mapping(uint256 => mapping(address => PlayerInfo)) private _players;

    /// poolId → list of player addresses (for iteration during resolution)
    mapping(uint256 => address[]) private _playerList;

    /// poolId → round → player → Choice (separate from PlayerInfo for gas)
    mapping(uint256 => mapping(uint32 => mapping(address => Choice))) private _roundChoices;

    /// poolId → pending payout for winner (set after game ends, cleared on claim)
    mapping(uint256 => uint256) private _pendingPayouts;

    /// Global creator stake: creator → USDC deposited
    mapping(address => uint256) public creatorStake;

    /// Number of non-terminal pools (PENDING | ACTIVE | RESOLVING) per creator
    mapping(address => uint256) private _activePoolCount;

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    /// @param _usdc        USDC token address
    /// @param _rwaAdapter  RWAAdapter contract address
    /// @param _initialOwner  Protocol owner (2-step handoff via ArenaVRF → Ownable2Step)
    constructor(
        address _usdc,
        address _rwaAdapter,
        address _initialOwner
    ) ArenaVRF(_initialOwner) {
        usdc = _usdc;
        rwaAdapter = _rwaAdapter;
    }

    // -------------------------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------------------------

    modifier poolExists(uint256 poolId) {
        if (poolId == 0 || poolId > _poolCount) revert PoolNotFound(poolId);
        _;
    }

    modifier inStatus(uint256 poolId, PoolStatus required) {
        PoolStatus current = _states[poolId].status;
        if (current != required) revert InvalidPoolStatus(current, required);
        _;
    }

    // -------------------------------------------------------------------------
    // Creator Stake
    // -------------------------------------------------------------------------

    /// @inheritdoc IArenaManager
    function depositCreatorStake(uint256 amount) external override nonReentrant {
        if (amount == 0) revert InvalidConfig();

        IERC20(usdc).safeTransferFrom(msg.sender, address(this), amount);
        creatorStake[msg.sender] += amount;

        emit CreatorStakeDeposited(msg.sender, amount, creatorStake[msg.sender]);
    }

    /// @inheritdoc IArenaManager
    function withdrawCreatorStake() external override nonReentrant {
        uint256 stake = creatorStake[msg.sender];
        if (stake == 0) revert NothingToClaim();

        creatorStake[msg.sender] = 0;

        if (_activePoolCount[msg.sender] > 0) {
            // Slash: send to protocol owner
            IERC20(usdc).safeTransfer(owner(), stake);
            emit CreatorStakeSlashed(msg.sender, stake);
        } else {
            // Clean withdrawal
            IERC20(usdc).safeTransfer(msg.sender, stake);
            emit CreatorStakeWithdrawn(msg.sender, stake);
        }
    }

    /// @inheritdoc IArenaManager
    function creatorActivePools(address creator) external view override returns (uint256) {
        return _activePoolCount[creator];
    }

    // -------------------------------------------------------------------------
    // Pool Management
    // -------------------------------------------------------------------------

    /// @inheritdoc IArenaManager
    function createPool(
        uint256 entryFee,
        uint32  maxPlayers,
        uint32  minPlayers,
        uint32  roundDuration,
        uint32  startDeadline
    ) external override nonReentrant returns (uint256 poolId) {
        // Creator must have staked
        if (creatorStake[msg.sender] < MIN_CREATOR_STAKE) revert InsufficientCreatorStake();

        // Validate config
        if (entryFee < MIN_ENTRY_FEE || entryFee > MAX_ENTRY_FEE) revert InvalidConfig();
        if (maxPlayers < MIN_PLAYERS_MIN || maxPlayers > MAX_PLAYERS_CAP) revert InvalidConfig();
        if (minPlayers < MIN_PLAYERS_MIN || minPlayers > maxPlayers) revert InvalidConfig();
        if (roundDuration < MIN_ROUND_DURATION || roundDuration > MAX_ROUND_DURATION) revert InvalidConfig();
        if (startDeadline <= block.timestamp) revert InvalidConfig();

        poolId = ++_poolCount;
        _activePoolCount[msg.sender]++;

        _configs[poolId] = PoolConfig({
            host:          msg.sender,
            entryFee:      entryFee,
            maxPlayers:    maxPlayers,
            minPlayers:    minPlayers,
            roundDuration: roundDuration,
            startDeadline: startDeadline
        });

        _states[poolId] = PoolState({
            status:         PoolStatus.PENDING,
            currentRound:   0,
            survivorCount:  0,
            playerCount:    0,
            totalDeposited: 0,
            roundDeadline:  0,
            winner:         address(0)
        });

        emit PoolCreated(poolId, msg.sender, entryFee, maxPlayers);
    }

    /// @inheritdoc IArenaManager
    function joinPool(uint256 poolId)
        external
        override
        nonReentrant
        poolExists(poolId)
        inStatus(poolId, PoolStatus.PENDING)
    {
        PoolConfig storage cfg = _configs[poolId];
        PoolState  storage st  = _states[poolId];

        if (block.timestamp >= cfg.startDeadline) revert StartDeadlinePassed();
        if (st.playerCount >= cfg.maxPlayers) revert PoolFull();
        if (_players[poolId][msg.sender].isActive) revert AlreadyJoined(msg.sender);

        // Pull entry fee
        IERC20(usdc).safeTransferFrom(msg.sender, address(this), cfg.entryFee);

        _players[poolId][msg.sender] = PlayerInfo({
            isActive:        true,
            hasClaimed:      false,
            roundEliminated: 0,
            lastChoice:      Choice.NONE
        });

        _playerList[poolId].push(msg.sender);
        st.playerCount++;
        st.totalDeposited += cfg.entryFee;

        emit PlayerJoined(poolId, msg.sender, cfg.entryFee);

        // Auto-start when max players reached
        if (st.playerCount == cfg.maxPlayers) {
            _startGame(poolId);
        }
    }

    /// @inheritdoc IArenaManager
    function startGame(uint256 poolId)
        external
        override
        poolExists(poolId)
        inStatus(poolId, PoolStatus.PENDING)
    {
        PoolConfig storage cfg = _configs[poolId];
        PoolState  storage st  = _states[poolId];

        if (msg.sender != cfg.host && msg.sender != owner()) revert NotActivePlayer();
        if (st.playerCount < cfg.minPlayers) revert MinPlayersNotMet();

        _startGame(poolId);
    }

    function _startGame(uint256 poolId) internal {
        PoolState  storage st  = _states[poolId];
        PoolConfig storage cfg = _configs[poolId];

        st.status        = PoolStatus.ACTIVE;
        st.currentRound  = 1;
        st.survivorCount = st.playerCount;
        st.roundDeadline = block.timestamp + cfg.roundDuration;

        // Deposit all player entry fees into RWA adapter
        uint256 totalFunds = st.totalDeposited;
        if (totalFunds > 0) {
            IERC20(usdc).approve(rwaAdapter, totalFunds);
            IERC20(usdc).safeTransfer(rwaAdapter, totalFunds);
            IRWAAdapter(rwaAdapter).deposit(poolId, totalFunds);
        }

        emit GameStarted(poolId, st.playerCount);
    }

    /// @inheritdoc IArenaManager
    function cancelPool(uint256 poolId)
        external
        override
        nonReentrant
        poolExists(poolId)
    {
        PoolConfig storage cfg = _configs[poolId];
        PoolState  storage st  = _states[poolId];

        if (msg.sender != cfg.host && msg.sender != owner()) revert NotActivePlayer();
        if (st.status != PoolStatus.PENDING) revert InvalidPoolStatus(st.status, PoolStatus.PENDING);

        st.status = PoolStatus.CANCELLED;
        _activePoolCount[cfg.host]--;

        emit PoolCancelled(poolId);
    }

    // -------------------------------------------------------------------------
    // Round Actions
    // -------------------------------------------------------------------------

    /// @inheritdoc IArenaManager
    function submitChoice(uint256 poolId, Choice choice)
        external
        override
        poolExists(poolId)
        inStatus(poolId, PoolStatus.ACTIVE)
    {
        PoolState storage st = _states[poolId];

        if (!_players[poolId][msg.sender].isActive) revert NotActivePlayer();
        if (block.timestamp > st.roundDeadline) revert RoundDeadlinePassed();
        if (_roundChoices[poolId][st.currentRound][msg.sender] != Choice.NONE) revert AlreadySubmitted();
        if (choice == Choice.NONE) revert RoundNotOpen();

        _roundChoices[poolId][st.currentRound][msg.sender] = choice;
        _players[poolId][msg.sender].lastChoice = choice;

        emit ChoiceSubmitted(poolId, msg.sender, st.currentRound, choice);
    }

    /// @inheritdoc IArenaManager
    function resolveRound(uint256 poolId)
        external
        override
        nonReentrant
        poolExists(poolId)
        inStatus(poolId, PoolStatus.ACTIVE)
    {
        PoolState  storage st  = _states[poolId];
        PoolConfig storage cfg = _configs[poolId];

        if (block.timestamp <= st.roundDeadline) revert RoundDeadlineNotPassed();

        st.status = PoolStatus.RESOLVING;

        uint32 round = st.currentRound;
        address[] storage players = _playerList[poolId];

        uint32 headsCount;
        uint32 tailsCount;

        uint256 len = players.length;
        for (uint256 i = 0; i < len; ++i) {
            address p = players[i];
            if (!_players[poolId][p].isActive) continue;

            Choice c = _roundChoices[poolId][round][p];
            if (c == Choice.TAILS) {
                tailsCount++;
            } else {
                headsCount++;
            }
        }

        Choice minorityChoice;
        bool isTie = (headsCount == tailsCount);

        if (!isTie) {
            minorityChoice = (headsCount < tailsCount) ? Choice.HEADS : Choice.TAILS;
        }

        uint32 eliminated;
        for (uint256 i = 0; i < len; ++i) {
            address p = players[i];
            if (!_players[poolId][p].isActive) continue;

            if (!isTie) {
                Choice c = _roundChoices[poolId][round][p];
                bool choseMinority = (c == minorityChoice) ||
                    (c == Choice.NONE && minorityChoice == Choice.HEADS);

                if (!choseMinority) {
                    _players[poolId][p].isActive = false;
                    _players[poolId][p].roundEliminated = round;
                    eliminated++;
                }
            }
        }

        st.survivorCount -= eliminated;

        emit RoundResolved(poolId, round, isTie ? Choice.NONE : minorityChoice, st.survivorCount, eliminated);

        // Check if game is over
        if (st.survivorCount <= 1) {
            _finishGame(poolId);
        } else {
            // Start next round
            st.status       = PoolStatus.ACTIVE;
            st.currentRound = round + 1;
            st.roundDeadline = block.timestamp + cfg.roundDuration;
        }
    }

    function _finishGame(uint256 poolId) internal {
        PoolState  storage st  = _states[poolId];
        PoolConfig storage cfg = _configs[poolId];

        st.status = PoolStatus.FINISHED;
        _activePoolCount[cfg.host]--;

        // Find the winner (last active player)
        address[] storage players = _playerList[poolId];
        address winner;
        uint256 len = players.length;
        for (uint256 i = 0; i < len; ++i) {
            if (_players[poolId][players[i]].isActive) {
                winner = players[i];
                break;
            }
        }

        st.winner = winner;

        uint256 payout;
        if (IRWAAdapter(rwaAdapter).currentValue(poolId) > 0) {
            payout = IRWAAdapter(rwaAdapter).withdraw(poolId, address(this));
        }
        if (winner != address(0)) {
            _pendingPayouts[poolId] = payout;
        }

        emit GameFinished(poolId, winner, payout);
    }

    // -------------------------------------------------------------------------
    // Claims
    // -------------------------------------------------------------------------

    /// @inheritdoc IArenaManager
    function claimWinnings(uint256 poolId)
        external
        override
        nonReentrant
        poolExists(poolId)
        inStatus(poolId, PoolStatus.FINISHED)
    {
        PoolState storage st = _states[poolId];
        PlayerInfo storage pi = _players[poolId][msg.sender];

        if (st.winner != msg.sender) revert NotWinner();
        if (pi.hasClaimed) revert NothingToClaim();

        pi.hasClaimed = true;

        uint256 amount = _pendingPayouts[poolId];
        _pendingPayouts[poolId] = 0;

        if (amount == 0) revert NothingToClaim();

        IERC20(usdc).safeTransfer(msg.sender, amount);

        emit WinningsClaimed(poolId, msg.sender, amount);
    }

    /// @inheritdoc IArenaManager
    function claimRefund(uint256 poolId)
        external
        override
        nonReentrant
        poolExists(poolId)
    {
        PoolState  storage st  = _states[poolId];
        PoolConfig storage cfg = _configs[poolId];
        PlayerInfo storage pi  = _players[poolId][msg.sender];

        if (st.status != PoolStatus.CANCELLED) revert InvalidPoolStatus(st.status, PoolStatus.CANCELLED);
        if (pi.hasClaimed) revert NothingToClaim();
        if (!pi.isActive && pi.roundEliminated == 0) revert NothingToClaim(); // never joined

        pi.hasClaimed = true;

        uint256 refund = cfg.entryFee;
        IERC20(usdc).safeTransfer(msg.sender, refund);

        emit RefundClaimed(poolId, msg.sender, refund);
    }

    // -------------------------------------------------------------------------
    // Views
    // -------------------------------------------------------------------------

    function getPoolConfig(uint256 poolId)
        external
        view
        override
        poolExists(poolId)
        returns (PoolConfig memory)
    {
        return _configs[poolId];
    }

    function getPoolState(uint256 poolId)
        external
        view
        override
        poolExists(poolId)
        returns (PoolState memory)
    {
        return _states[poolId];
    }

    function getPlayerInfo(uint256 poolId, address player)
        external
        view
        override
        poolExists(poolId)
        returns (PlayerInfo memory)
    {
        return _players[poolId][player];
    }

    function getPlayers(uint256 poolId) external view poolExists(poolId) returns (address[] memory) {
        return _playerList[poolId];
    }

    function poolCount() external view override returns (uint256) {
        return _poolCount;
    }

    function pendingPayout(uint256 poolId) external view poolExists(poolId) returns (uint256) {
        return _pendingPayouts[poolId];
    }
}
