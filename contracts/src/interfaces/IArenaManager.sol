// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;


interface IArenaManager {

    enum PoolStatus {
        PENDING,
        ACTIVE,
        RESOLVING,
        FINISHED,
        CANCELLED
    }


    enum Choice {
        NONE,
        HEADS,
        TAILS
    }

    struct PoolConfig {
        address host;
        uint256 entryFee;
        uint32  maxPlayers;
        uint32  minPlayers;
        uint32  roundDuration;
        uint32  startDeadline;
    }


    struct PoolState {
        PoolStatus status;
        uint32     currentRound;
        uint32     survivorCount;
        uint32     playerCount;
        uint256    totalDeposited;
        uint256    roundDeadline;
        address    winner;
    }


    struct PlayerInfo {
        bool    isActive;
        bool    hasClaimed;
        uint32  roundEliminated;
        Choice  lastChoice;
    }

    // ── Events ──────────────────────────────────────────────────────────────

    event PoolCreated(
        uint256 indexed poolId,
        address indexed host,
        uint256 entryFee,
        uint32  maxPlayers
    );

    event PlayerJoined(uint256 indexed poolId, address indexed player, uint256 amount);

    event GameStarted(uint256 indexed poolId, uint32 playerCount);

    event ChoiceSubmitted(uint256 indexed poolId, address indexed player, uint32 round, Choice choice);

    event RoundResolved(
        uint256 indexed poolId,
        uint32  indexed round,
        Choice  minorityChoice,
        uint32  survivorsRemaining,
        uint32  eliminated
    );

    event GameFinished(uint256 indexed poolId, address indexed winner, uint256 payout);

    event PoolCancelled(uint256 indexed poolId);

    event RefundClaimed(uint256 indexed poolId, address indexed player, uint256 amount);

    event WinningsClaimed(uint256 indexed poolId, address indexed winner, uint256 amount);

    event CreatorStakeDeposited(address indexed creator, uint256 amount, uint256 totalStake);

    event CreatorStakeWithdrawn(address indexed creator, uint256 amount);

    event CreatorStakeSlashed(address indexed creator, uint256 slashedAmount);

    // ── Errors ──────────────────────────────────────────────────────────────

    error PoolNotFound(uint256 poolId);
    error InvalidPoolStatus(PoolStatus current, PoolStatus required);
    error AlreadyJoined(address player);
    error PoolFull();
    error InsufficientPayment(uint256 sent, uint256 required);
    error RoundNotOpen();
    error AlreadySubmitted();
    error NotActivePlayer();
    error RoundDeadlineNotPassed();
    error RoundDeadlinePassed();
    error NothingToClaim();
    error NotWinner();
    error StartDeadlinePassed();
    error MinPlayersNotMet();
    error TransferFailed();
    error InvalidConfig();
    error InsufficientCreatorStake();

    // ── Pool lifecycle ──────────────────────────────────────────────────────

    function createPool(
        uint256 entryFee,
        uint32  maxPlayers,
        uint32  minPlayers,
        uint32  roundDuration,
        uint32  startDeadline
    ) external returns (uint256 poolId);
    function joinPool(uint256 poolId) external;
    function startGame(uint256 poolId) external;
    function cancelPool(uint256 poolId) external;
    function submitChoice(uint256 poolId, Choice choice) external;
    function resolveRound(uint256 poolId) external;
    function claimWinnings(uint256 poolId) external;
    function claimRefund(uint256 poolId) external;

    // ── Creator stake ───────────────────────────────────────────────────────

    function depositCreatorStake(uint256 amount) external;
    function withdrawCreatorStake() external;

    // ── Views ───────────────────────────────────────────────────────────────

    function getPoolConfig(uint256 poolId) external view returns (PoolConfig memory);
    function getPoolState(uint256 poolId) external view returns (PoolState memory);
    function getPlayerInfo(uint256 poolId, address player) external view returns (PlayerInfo memory);
    function poolCount() external view returns (uint256);
    function usdc() external view returns (address);
    function rwaAdapter() external view returns (address);
    function creatorActivePools(address creator) external view returns (uint256);
}
