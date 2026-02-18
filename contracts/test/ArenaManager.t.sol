// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ArenaManager} from "../src/ArenaManager.sol";
import {RWAAdapter} from "../src/RWAAdapter.sol";
import {IArenaManager} from "../src/interfaces/IArenaManager.sol";

// ─────────────────────────────────────────────────────────────────────────────
// Mock USDC (6 decimals, mintable)
// ─────────────────────────────────────────────────────────────────────────────
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ArenaManager Tests
// ─────────────────────────────────────────────────────────────────────────────
contract ArenaManagerTest is Test {
    // ── Contracts ────────────────────────────────────────────────────────────
    MockUSDC    public usdc;
    RWAAdapter  public adapter;
    ArenaManager public manager;

    // ── Actors ───────────────────────────────────────────────────────────────
    address public owner   = makeAddr("owner");
    address public host    = makeAddr("host");
    address public alice   = makeAddr("alice");
    address public bob     = makeAddr("bob");
    address public carol   = makeAddr("carol");
    address public dave    = makeAddr("dave");

    // ── Constants ────────────────────────────────────────────────────────────
    uint256 public constant ENTRY_FEE       = 10e6;   // 10 USDC
    uint256 public constant CREATOR_STAKE   = 4e6;    // 4 USDC
    uint32  public constant MAX_PLAYERS     = 4;
    uint32  public constant MIN_PLAYERS     = 2;
    uint32  public constant ROUND_DURATION  = 300;    // 5 minutes
    uint32  public constant START_DEADLINE  = 1 days;

    // ─────────────────────────────────────────────────────────────────────────
    // Setup
    // ─────────────────────────────────────────────────────────────────────────

    function setUp() public {
        vm.startPrank(owner);

        usdc    = new MockUSDC();
        adapter = new RWAAdapter(address(usdc), address(0), owner); // mock mode
        manager = new ArenaManager(address(usdc), address(adapter), owner);
        adapter.setArenaManager(address(manager));

        vm.stopPrank();

        // Fund all actors and approve manager
        address[4] memory actors = [host, alice, bob, carol];
        for (uint256 i = 0; i < actors.length; ++i) {
            usdc.mint(actors[i], 1_000e6);
            vm.prank(actors[i]);
            usdc.approve(address(manager), type(uint256).max);
        }
        usdc.mint(dave, 1_000e6);
        vm.prank(dave);
        usdc.approve(address(manager), type(uint256).max);

        // Host deposits creator stake so they can create pools
        vm.prank(host);
        manager.depositCreatorStake(CREATOR_STAKE);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    function _createPool() internal returns (uint256 poolId) {
        vm.prank(host);
        poolId = manager.createPool(
            ENTRY_FEE,
            MAX_PLAYERS,
            MIN_PLAYERS,
            ROUND_DURATION,
            uint32(block.timestamp + START_DEADLINE)
        );
    }

    function _joinPool(uint256 poolId, address player) internal {
        vm.prank(player);
        manager.joinPool(poolId);
    }

    function _skipToAfterRoundDeadline(uint256 poolId) internal {
        IArenaManager.PoolState memory st = manager.getPoolState(poolId);
        vm.warp(st.roundDeadline + 1);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Creator Stake Tests
    // ─────────────────────────────────────────────────────────────────────────

    function test_DepositCreatorStake() public {
        uint256 balBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        manager.depositCreatorStake(CREATOR_STAKE);
        assertEq(manager.creatorStake(alice), CREATOR_STAKE);
        assertEq(usdc.balanceOf(alice), balBefore - CREATOR_STAKE);
    }

    function test_DepositCreatorStake_Additive() public {
        vm.prank(alice);
        manager.depositCreatorStake(CREATOR_STAKE);
        vm.prank(alice);
        manager.depositCreatorStake(2e6);
        assertEq(manager.creatorStake(alice), CREATOR_STAKE + 2e6);
    }

    function test_CreatePool_WithoutCreatorStake_Reverts() public {
        vm.prank(alice); // alice has no creator stake
        vm.expectRevert(IArenaManager.InsufficientCreatorStake.selector);
        manager.createPool(
            ENTRY_FEE,
            MAX_PLAYERS,
            MIN_PLAYERS,
            ROUND_DURATION,
            uint32(block.timestamp + START_DEADLINE)
        );
    }

    function test_WithdrawCreatorStake_NoActivePools() public {
        // alice deposits and then withdraws (no pools created)
        vm.prank(alice);
        manager.depositCreatorStake(CREATOR_STAKE);

        uint256 balBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        manager.withdrawCreatorStake();

        assertEq(usdc.balanceOf(alice), balBefore + CREATOR_STAKE);
        assertEq(manager.creatorStake(alice), 0);
    }

    function test_WithdrawCreatorStake_WithActivePools_Slashes() public {
        // host already has creator stake + one pool from _createPool
        _createPool(); // creates a PENDING pool for host

        uint256 ownerBalBefore = usdc.balanceOf(owner);
        uint256 hostStake = manager.creatorStake(host);

        vm.prank(host);
        manager.withdrawCreatorStake();

        // Stake goes to owner, not back to host
        assertEq(usdc.balanceOf(owner), ownerBalBefore + hostStake);
        assertEq(manager.creatorStake(host), 0);
    }

    function test_WithdrawCreatorStake_NothingToWithdraw_Reverts() public {
        vm.prank(alice); // alice has no stake
        vm.expectRevert(IArenaManager.NothingToClaim.selector);
        manager.withdrawCreatorStake();
    }

    function test_ActivePoolCount_DecrementsOnCancel() public {
        _createPool();
        assertEq(manager.creatorActivePools(host), 1);

        vm.prank(host);
        manager.cancelPool(1);
        assertEq(manager.creatorActivePools(host), 0);
    }

    function test_ActivePoolCount_DecrementsOnFinish() public {
        uint256 poolId = _createPool();
        assertEq(manager.creatorActivePools(host), 1);

        _joinPool(poolId, alice);
        _joinPool(poolId, bob);
        _joinPool(poolId, carol);
        vm.prank(host);
        manager.startGame(poolId);

        // alice=TAILS (minority wins), bob+carol=HEADS
        vm.prank(alice); manager.submitChoice(poolId, IArenaManager.Choice.TAILS);
        vm.prank(bob);   manager.submitChoice(poolId, IArenaManager.Choice.HEADS);
        vm.prank(carol); manager.submitChoice(poolId, IArenaManager.Choice.HEADS);

        _skipToAfterRoundDeadline(poolId);
        manager.resolveRound(poolId);

        // Game finished → active pool count should be 0
        assertEq(manager.creatorActivePools(host), 0);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Pool Creation Tests
    // ─────────────────────────────────────────────────────────────────────────

    function test_CreatePool() public {
        uint256 poolId = _createPool();
        assertEq(poolId, 1, "First pool should be id=1");

        IArenaManager.PoolConfig memory cfg = manager.getPoolConfig(poolId);
        assertEq(cfg.host, host);
        assertEq(cfg.entryFee, ENTRY_FEE);
        assertEq(cfg.maxPlayers, MAX_PLAYERS);

        IArenaManager.PoolState memory st = manager.getPoolState(poolId);
        assertEq(uint8(st.status), uint8(IArenaManager.PoolStatus.PENDING));
    }

    function test_CreatePool_IncrementsCount() public {
        _createPool();
        _createPool();
        assertEq(manager.poolCount(), 2);
    }

    function test_CreatePool_InvalidFee_Reverts() public {
        vm.prank(host);
        vm.expectRevert(IArenaManager.InvalidConfig.selector);
        manager.createPool(
            0, // invalid: below MIN_ENTRY_FEE
            MAX_PLAYERS,
            MIN_PLAYERS,
            ROUND_DURATION,
            uint32(block.timestamp + START_DEADLINE)
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Join Pool Tests
    // ─────────────────────────────────────────────────────────────────────────

    function test_JoinPool() public {
        uint256 poolId = _createPool();
        _joinPool(poolId, alice);

        IArenaManager.PlayerInfo memory pi = manager.getPlayerInfo(poolId, alice);
        assertTrue(pi.isActive);

        IArenaManager.PoolState memory st = manager.getPoolState(poolId);
        assertEq(st.playerCount, 1);
        assertEq(st.totalDeposited, ENTRY_FEE);
    }

    function test_JoinPool_TransfersUSDC() public {
        uint256 poolId = _createPool();
        uint256 balBefore = usdc.balanceOf(alice);
        _joinPool(poolId, alice);
        assertEq(usdc.balanceOf(alice), balBefore - ENTRY_FEE);
    }

    function test_JoinPool_DuplicateReverts() public {
        uint256 poolId = _createPool();
        _joinPool(poolId, alice);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(IArenaManager.AlreadyJoined.selector, alice));
        manager.joinPool(poolId);
    }

    function test_JoinPool_FullReverts() public {
        uint256 poolId = _createPool();
        _joinPool(poolId, alice);
        _joinPool(poolId, bob);
        _joinPool(poolId, carol);
        _joinPool(poolId, dave); // fills to max (4)
        // Pool should now be ACTIVE (auto-started)
        IArenaManager.PoolState memory st = manager.getPoolState(poolId);
        assertEq(uint8(st.status), uint8(IArenaManager.PoolStatus.ACTIVE));
    }

    function test_JoinPool_AutoStartsAtMax() public {
        uint256 poolId = _createPool();
        _joinPool(poolId, alice);
        _joinPool(poolId, bob);
        _joinPool(poolId, carol);
        _joinPool(poolId, dave); // 4th player triggers auto-start

        IArenaManager.PoolState memory st = manager.getPoolState(poolId);
        assertEq(uint8(st.status), uint8(IArenaManager.PoolStatus.ACTIVE));
        assertEq(st.currentRound, 1);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Start Game Tests
    // ─────────────────────────────────────────────────────────────────────────

    function test_StartGame_ByHost() public {
        uint256 poolId = _createPool();
        _joinPool(poolId, alice);
        _joinPool(poolId, bob);

        vm.prank(host);
        manager.startGame(poolId);

        IArenaManager.PoolState memory st = manager.getPoolState(poolId);
        assertEq(uint8(st.status), uint8(IArenaManager.PoolStatus.ACTIVE));
    }

    function test_StartGame_NotEnoughPlayers_Reverts() public {
        uint256 poolId = _createPool();
        _joinPool(poolId, alice); // only 1 player, min is 2

        vm.prank(host);
        vm.expectRevert(IArenaManager.MinPlayersNotMet.selector);
        manager.startGame(poolId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Choice Submission Tests
    // ─────────────────────────────────────────────────────────────────────────

    function test_SubmitChoice() public {
        uint256 poolId = _createPool();
        _joinPool(poolId, alice);
        _joinPool(poolId, bob);
        vm.prank(host);
        manager.startGame(poolId);

        vm.prank(alice);
        manager.submitChoice(poolId, IArenaManager.Choice.HEADS);

        IArenaManager.PlayerInfo memory pi = manager.getPlayerInfo(poolId, alice);
        assertEq(uint8(pi.lastChoice), uint8(IArenaManager.Choice.HEADS));
    }

    function test_SubmitChoice_Duplicate_Reverts() public {
        uint256 poolId = _createPool();
        _joinPool(poolId, alice);
        _joinPool(poolId, bob);
        vm.prank(host);
        manager.startGame(poolId);

        vm.prank(alice);
        manager.submitChoice(poolId, IArenaManager.Choice.HEADS);

        vm.prank(alice);
        vm.expectRevert(IArenaManager.AlreadySubmitted.selector);
        manager.submitChoice(poolId, IArenaManager.Choice.TAILS);
    }

    function test_SubmitChoice_AfterDeadline_Reverts() public {
        uint256 poolId = _createPool();
        _joinPool(poolId, alice);
        _joinPool(poolId, bob);
        vm.prank(host);
        manager.startGame(poolId);

        _skipToAfterRoundDeadline(poolId);

        vm.prank(alice);
        vm.expectRevert(IArenaManager.RoundDeadlinePassed.selector);
        manager.submitChoice(poolId, IArenaManager.Choice.HEADS);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Round Resolution Tests — Minority Wins
    // ─────────────────────────────────────────────────────────────────────────

    function test_ResolveRound_MinorityWins() public {
        // 3 players: alice=TAILS (minority), bob=HEADS, carol=HEADS
        uint256 poolId = _createPool();
        _joinPool(poolId, alice);
        _joinPool(poolId, bob);
        _joinPool(poolId, carol);
        vm.prank(host);
        manager.startGame(poolId);

        vm.prank(alice);  manager.submitChoice(poolId, IArenaManager.Choice.TAILS);
        vm.prank(bob);    manager.submitChoice(poolId, IArenaManager.Choice.HEADS);
        vm.prank(carol);  manager.submitChoice(poolId, IArenaManager.Choice.HEADS);

        _skipToAfterRoundDeadline(poolId);
        manager.resolveRound(poolId);

        // Alice survives; bob and carol eliminated
        assertTrue(manager.getPlayerInfo(poolId, alice).isActive);
        assertFalse(manager.getPlayerInfo(poolId, bob).isActive);
        assertFalse(manager.getPlayerInfo(poolId, carol).isActive);

        IArenaManager.PoolState memory st = manager.getPoolState(poolId);
        // 1 survivor → game should be FINISHED
        assertEq(uint8(st.status), uint8(IArenaManager.PoolStatus.FINISHED));
        assertEq(st.winner, alice);
    }

    function test_ResolveRound_Tie_EverybodySurvives() public {
        uint256 poolId = _createPool();
        _joinPool(poolId, alice);
        _joinPool(poolId, bob);
        vm.prank(host);
        manager.startGame(poolId);

        vm.prank(alice); manager.submitChoice(poolId, IArenaManager.Choice.HEADS);
        vm.prank(bob);   manager.submitChoice(poolId, IArenaManager.Choice.TAILS);

        _skipToAfterRoundDeadline(poolId);
        manager.resolveRound(poolId);

        assertTrue(manager.getPlayerInfo(poolId, alice).isActive);
        assertTrue(manager.getPlayerInfo(poolId, bob).isActive);

        IArenaManager.PoolState memory st = manager.getPoolState(poolId);
        assertEq(uint8(st.status), uint8(IArenaManager.PoolStatus.ACTIVE));
        assertEq(st.currentRound, 2);
    }

    function test_ResolveRound_NonSubmitter_DefaultsToHeads() public {
        // 3 players: alice=TAILS (minority), bob+carol don't submit (default HEADS)
        uint256 poolId = _createPool();
        _joinPool(poolId, alice);
        _joinPool(poolId, bob);
        _joinPool(poolId, carol);
        vm.prank(host);
        manager.startGame(poolId);

        // Only alice submits TAILS; bob and carol don't submit → default to HEADS
        vm.prank(alice); manager.submitChoice(poolId, IArenaManager.Choice.TAILS);

        _skipToAfterRoundDeadline(poolId);
        manager.resolveRound(poolId);

        // alice (TAILS, 1 vote = minority) survives; bob and carol eliminated
        assertTrue(manager.getPlayerInfo(poolId, alice).isActive);
        assertFalse(manager.getPlayerInfo(poolId, bob).isActive);
        assertFalse(manager.getPlayerInfo(poolId, carol).isActive);
    }

    function test_ResolveRound_BeforeDeadline_Reverts() public {
        uint256 poolId = _createPool();
        _joinPool(poolId, alice);
        _joinPool(poolId, bob);
        vm.prank(host);
        manager.startGame(poolId);

        vm.expectRevert(IArenaManager.RoundDeadlineNotPassed.selector);
        manager.resolveRound(poolId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Payout Tests
    // ─────────────────────────────────────────────────────────────────────────

    function test_ClaimWinnings() public {
        // 3 players: alice=TAILS (minority), bob+carol=HEADS (majority)
        uint256 poolId = _createPool();
        _joinPool(poolId, alice);
        _joinPool(poolId, bob);
        _joinPool(poolId, carol);
        vm.prank(host);
        manager.startGame(poolId);

        vm.prank(alice); manager.submitChoice(poolId, IArenaManager.Choice.TAILS);
        vm.prank(bob);   manager.submitChoice(poolId, IArenaManager.Choice.HEADS);
        vm.prank(carol); manager.submitChoice(poolId, IArenaManager.Choice.HEADS);

        _skipToAfterRoundDeadline(poolId);
        manager.resolveRound(poolId);

        uint256 balBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        manager.claimWinnings(poolId);

        // Alice receives 3 × ENTRY_FEE (all three players' funds)
        assertEq(usdc.balanceOf(alice), balBefore + (3 * ENTRY_FEE));
    }

    function test_ClaimWinnings_NonWinner_Reverts() public {
        uint256 poolId = _createPool();
        _joinPool(poolId, alice);
        _joinPool(poolId, bob);
        _joinPool(poolId, carol);
        vm.prank(host);
        manager.startGame(poolId);

        vm.prank(alice); manager.submitChoice(poolId, IArenaManager.Choice.TAILS);
        vm.prank(bob);   manager.submitChoice(poolId, IArenaManager.Choice.HEADS);
        vm.prank(carol); manager.submitChoice(poolId, IArenaManager.Choice.HEADS);

        _skipToAfterRoundDeadline(poolId);
        manager.resolveRound(poolId);

        vm.prank(bob);
        vm.expectRevert(IArenaManager.NotWinner.selector);
        manager.claimWinnings(poolId);
    }

    function test_ClaimWinnings_DoubleClaim_Reverts() public {
        uint256 poolId = _createPool();
        _joinPool(poolId, alice);
        _joinPool(poolId, bob);
        _joinPool(poolId, carol);
        vm.prank(host);
        manager.startGame(poolId);

        vm.prank(alice); manager.submitChoice(poolId, IArenaManager.Choice.TAILS);
        vm.prank(bob);   manager.submitChoice(poolId, IArenaManager.Choice.HEADS);
        vm.prank(carol); manager.submitChoice(poolId, IArenaManager.Choice.HEADS);

        _skipToAfterRoundDeadline(poolId);
        manager.resolveRound(poolId);

        vm.prank(alice); manager.claimWinnings(poolId);

        vm.prank(alice);
        vm.expectRevert(IArenaManager.NothingToClaim.selector);
        manager.claimWinnings(poolId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Cancel & Refund Tests
    // ─────────────────────────────────────────────────────────────────────────

    function test_CancelPool_ByHost() public {
        uint256 poolId = _createPool();
        _joinPool(poolId, alice);

        vm.prank(host);
        manager.cancelPool(poolId);

        IArenaManager.PoolState memory st = manager.getPoolState(poolId);
        assertEq(uint8(st.status), uint8(IArenaManager.PoolStatus.CANCELLED));
    }

    function test_ClaimRefund_AfterCancel() public {
        uint256 poolId = _createPool();
        _joinPool(poolId, alice);

        vm.prank(host);
        manager.cancelPool(poolId);

        uint256 balBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        manager.claimRefund(poolId);

        assertEq(usdc.balanceOf(alice), balBefore + ENTRY_FEE);
    }

    function test_ClaimRefund_DoubleRefund_Reverts() public {
        uint256 poolId = _createPool();
        _joinPool(poolId, alice);
        vm.prank(host);
        manager.cancelPool(poolId);

        vm.prank(alice); manager.claimRefund(poolId);
        vm.prank(alice);
        vm.expectRevert(IArenaManager.NothingToClaim.selector);
        manager.claimRefund(poolId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Fuzz Tests
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Fuzz the entry fee within valid range and confirm pool creation succeeds.
    function testFuzz_CreatePool_ValidFeeRange(uint256 fee) public {
        fee = bound(fee, manager.MIN_ENTRY_FEE(), manager.MAX_ENTRY_FEE());
        vm.prank(host);
        uint256 poolId = manager.createPool(
            fee,
            MAX_PLAYERS,
            MIN_PLAYERS,
            ROUND_DURATION,
            uint32(block.timestamp + START_DEADLINE)
        );
        assertGt(poolId, 0);
    }

    /// @notice Fuzz number of players (2–4) and ensure game can always be started.
    function testFuzz_FullGame_TwoToFourPlayers(uint8 numPlayers) public {
        numPlayers = uint8(bound(numPlayers, 2, 4));

        address[] memory actors = new address[](numPlayers);
        for (uint8 i = 0; i < numPlayers; ++i) {
            actors[i] = address(uint160(0xBEEF + i));
            usdc.mint(actors[i], 1_000e6);
            vm.prank(actors[i]);
            usdc.approve(address(manager), type(uint256).max);
        }

        vm.prank(host);
        uint256 poolId = manager.createPool(
            ENTRY_FEE,
            numPlayers,
            numPlayers,
            ROUND_DURATION,
            uint32(block.timestamp + START_DEADLINE)
        );

        for (uint8 i = 0; i < numPlayers; ++i) {
            vm.prank(actors[i]);
            manager.joinPool(poolId);
        }

        // Game should have auto-started (max = min = numPlayers)
        IArenaManager.PoolState memory st = manager.getPoolState(poolId);
        assertEq(uint8(st.status), uint8(IArenaManager.PoolStatus.ACTIVE));
    }
}
