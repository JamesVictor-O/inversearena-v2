import { parseUnits, parseEventLogs, type Address } from "viem";
import {
  readContract,
  writeContract,
  waitForTransactionReceipt,
  getPublicClient,
} from "@wagmi/core";
import { wagmiConfig } from "./wagmi";
import { arenaManagerAbi, PoolStatus, Choice } from "./arenaManagerAbi";

// ─── Contract addresses ───────────────────────────────────────────────────────

const ARENA_MANAGER = (
  process.env.NEXT_PUBLIC_ARENA_MANAGER_ADDRESS ?? ""
) as Address;

// USDC on Arbitrum Sepolia (chainId 421614)
const USDC_ADDRESS = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d" as Address;

const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// Round speed label → on-chain seconds
const ROUND_SPEED_SECONDS: Record<string, number> = {
  "30S": 30,
  "1M": 60,
  "5M": 300,
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ArenaState {
  /** Number of players still in the game (after rounds). */
  survivorsCount: number;
  /** Number of players who have joined the pool (for PENDING: join count; for ACTIVE+: same as at start). */
  playerCount: number;
  maxCapacity: number;
  isUserIn: boolean;
  hasWon: boolean;
  currentStake: number;
  potentialPayout: number;
  // Extended fields from live contract
  poolStatus: number;
  currentRound: number;
  roundDeadline: number; // unix timestamp (seconds)
  winner: Address;
  entryFeeUsdc: number;
  roundDurationSeconds?: number;
}

// ─── Write helpers ────────────────────────────────────────────────────────────

/**
 * Get gas fee overrides from current block so we don't submit below base fee.
 * Call right before writeContract to avoid "max fee per gas less than block base fee".
 */
async function getGasFeeOverrides(chainId?: number): Promise<{
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
} | undefined> {
  try {
    const client = getPublicClient(wagmiConfig, chainId ? { chainId } : undefined);
    if (!client) return undefined;
    const block = await client.getBlock({ blockTag: "pending" });
    const baseFee = block.baseFeePerGas ?? 0n;
    if (baseFee === 0n) return undefined;
    // Use ~30% buffer over base fee so we stay above it when it moves
    const maxFeePerGas = (baseFee * 130n) / 100n;
    const maxPriorityFeePerGas = maxFeePerGas / 10n;
    return { maxFeePerGas, maxPriorityFeePerGas };
  } catch {
    return undefined;
  }
}

/** Approve USDC spending for ArenaManager if current allowance is insufficient. */
async function ensureUsdcAllowance(owner: Address, amount: bigint) {
  const allowance = await readContract(wagmiConfig, {
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [owner, ARENA_MANAGER],
  });

  if (allowance >= amount) return; // already approved

  const gasOverrides = await getGasFeeOverrides();
  const hash = await writeContract(wagmiConfig, {
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "approve",
    args: [ARENA_MANAGER, amount],
    ...gasOverrides,
  });
  await waitForTransactionReceipt(wagmiConfig, { hash });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Create a new arena pool. Returns the on-chain poolId.
 *
 * Contract requires the sender to have deposited at least 4 USDC creator stake
 * (depositCreatorStake) before calling createPool. createPool does not pull
 * USDC; it only checks creatorStake[msg.sender] >= MIN_CREATOR_STAKE.
 *
 * @param owner   Connected wallet address (host)
 * @param params  Pool configuration from the creation modal
 */
export async function createPool(
  owner: Address,
  params: {
    stakeAmount: number;
    currency: string;
    roundSpeed: string;
    arenaCapacity: number;
  }
): Promise<bigint> {
  const entryFee = parseUnits(params.stakeAmount.toFixed(6), 6); // USDC 6 decimals
  const roundDuration = ROUND_SPEED_SECONDS[params.roundSpeed] ?? 60;
  const startDeadline = Math.floor(Date.now() / 1000) + 86400; // now + 24h

  const gasOverrides = await getGasFeeOverrides();
  const hash = await writeContract(wagmiConfig, {
    address: ARENA_MANAGER,
    abi: arenaManagerAbi,
    functionName: "createPool",
    args: [
      entryFee,
      params.arenaCapacity,
      2, // minPlayers — contract minimum
      roundDuration,
      startDeadline,
    ],
    ...gasOverrides,
  });

  const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });

  // Decode PoolCreated event to extract the newly minted poolId
  const logs = parseEventLogs({
    abi: arenaManagerAbi,
    eventName: "PoolCreated",
    logs: receipt.logs,
  });

  return logs[0]?.args?.poolId ?? 0n;
}

/**
 * Join an existing arena pool.
 * Approves USDC for the exact entry fee then calls joinPool.
 */
export async function joinArena(
  address: Address,
  poolId: string | bigint,
  _entryFeeHint: number // kept for backward-compat; actual fee fetched from contract
): Promise<void> {
  const id = typeof poolId === "string" ? BigInt(poolId) : poolId;

  // Fetch authoritative entry fee from contract
  const config = await readContract(wagmiConfig, {
    address: ARENA_MANAGER,
    abi: arenaManagerAbi,
    functionName: "getPoolConfig",
    args: [id],
  });

  await ensureUsdcAllowance(address, config.entryFee);

  const gasOverrides = await getGasFeeOverrides();
  const hash = await writeContract(wagmiConfig, {
    address: ARENA_MANAGER,
    abi: arenaManagerAbi,
    functionName: "joinPool",
    args: [id],
    ...gasOverrides,
  });
  await waitForTransactionReceipt(wagmiConfig, { hash });
}

/**
 * Submit a Heads or Tails choice for the current round.
 * Choice.HEADS = 1, Choice.TAILS = 2 (matches contract enum).
 */
export async function submitChoice(
  _address: Address,
  poolId: string | bigint,
  choice: "Heads" | "Tails",
  _round: number // kept for backward-compat; contract uses currentRound internally
): Promise<void> {
  const id = typeof poolId === "string" ? BigInt(poolId) : poolId;
  const choiceValue = choice === "Heads" ? Choice.HEADS : Choice.TAILS;

  const gasOverrides = await getGasFeeOverrides();
  const hash = await writeContract(wagmiConfig, {
    address: ARENA_MANAGER,
    abi: arenaManagerAbi,
    functionName: "submitChoice",
    args: [id, choiceValue],
    ...gasOverrides,
  });
  await waitForTransactionReceipt(wagmiConfig, { hash });
}

/**
 * Claim winnings after winning the final round.
 */
export async function claimWinnings(
  _address: Address,
  poolId: string | bigint
): Promise<void> {
  const id = typeof poolId === "string" ? BigInt(poolId) : poolId;

  const gasOverrides = await getGasFeeOverrides();
  const hash = await writeContract(wagmiConfig, {
    address: ARENA_MANAGER,
    abi: arenaManagerAbi,
    functionName: "claimWinnings",
    args: [id],
    ...gasOverrides,
  });
  await waitForTransactionReceipt(wagmiConfig, { hash });
}

/**
 * Claim a refund after the pool is cancelled.
 */
export async function claimRefund(
  _address: Address,
  poolId: string | bigint
): Promise<void> {
  const id = typeof poolId === "string" ? BigInt(poolId) : poolId;

  const gasOverrides = await getGasFeeOverrides();
  const hash = await writeContract(wagmiConfig, {
    address: ARENA_MANAGER,
    abi: arenaManagerAbi,
    functionName: "claimRefund",
    args: [id],
    ...gasOverrides,
  });
  await waitForTransactionReceipt(wagmiConfig, { hash });
}

/**
 * Protocol-level USDC staking — not yet in the contract.
 */
export async function stakeProtocol(
  _address: Address,
  _amount: number
): Promise<void> {
  throw new Error("Protocol staking not yet available.");
}

// ─── Creator stake ──────────────────────────────────────────────────────────

/**
 * Deposit USDC as creator stake (minimum 4 USDC to create pools).
 */
export async function depositCreatorStake(
  owner: Address,
  amount: number
): Promise<void> {
  const amountWei = parseUnits(amount.toFixed(6), 6);
  await ensureUsdcAllowance(owner, amountWei);

  const gasOverrides = await getGasFeeOverrides();
  const hash = await writeContract(wagmiConfig, {
    address: ARENA_MANAGER,
    abi: arenaManagerAbi,
    functionName: "depositCreatorStake",
    args: [amountWei],
    ...gasOverrides,
  });
  await waitForTransactionReceipt(wagmiConfig, { hash });
}

/**
 * Withdraw creator stake. Slashes if the creator has active pools.
 */
export async function withdrawCreatorStake(
  _owner: Address
): Promise<void> {
  const gasOverrides = await getGasFeeOverrides();
  const hash = await writeContract(wagmiConfig, {
    address: ARENA_MANAGER,
    abi: arenaManagerAbi,
    functionName: "withdrawCreatorStake",
    args: [],
    ...gasOverrides,
  });
  await waitForTransactionReceipt(wagmiConfig, { hash });
}

/**
 * Fetch creator stake status: current stake amount and active pool count.
 */
export async function fetchCreatorStatus(
  address: Address
): Promise<{ stake: number; activePools: number }> {
  const [stakeRaw, activePoolsRaw] = await Promise.all([
    readContract(wagmiConfig, {
      address: ARENA_MANAGER,
      abi: arenaManagerAbi,
      functionName: "creatorStake",
      args: [address],
    }),
    readContract(wagmiConfig, {
      address: ARENA_MANAGER,
      abi: arenaManagerAbi,
      functionName: "creatorActivePools",
      args: [address],
    }),
  ]);
  return {
    stake: Number(stakeRaw) / 1e6,
    activePools: Number(activePoolsRaw),
  };
}

/**
 * Fetch the full on-chain state for an arena pool.
 * Falls back to zero values if the pool doesn't exist yet.
 */
export async function fetchArenaState(
  poolId: string | bigint,
  address: Address
): Promise<ArenaState> {
  const id = typeof poolId === "string" ? BigInt(poolId) : poolId;

  try {
    const [state, config, playerInfo] = await Promise.all([
      readContract(wagmiConfig, {
        address: ARENA_MANAGER,
        abi: arenaManagerAbi,
        functionName: "getPoolState",
        args: [id],
      }),
      readContract(wagmiConfig, {
        address: ARENA_MANAGER,
        abi: arenaManagerAbi,
        functionName: "getPoolConfig",
        args: [id],
      }),
      readContract(wagmiConfig, {
        address: ARENA_MANAGER,
        abi: arenaManagerAbi,
        functionName: "getPlayerInfo",
        args: [id, address],
      }),
    ]);

    const entryFeeUsdc = Number(config.entryFee) / 1e6;
    const totalDeposited = Number(state.totalDeposited) / 1e6;
    const isFinished = state.status === PoolStatus.FINISHED;
    const hasWon =
      isFinished &&
      state.winner.toLowerCase() === address.toLowerCase();

    return {
      survivorsCount: state.survivorCount,
      playerCount: state.playerCount,
      maxCapacity: config.maxPlayers,
      isUserIn: playerInfo.isActive,
      hasWon,
      currentStake: playerInfo.isActive ? entryFeeUsdc : 0,
      potentialPayout: totalDeposited,
      poolStatus: state.status,
      currentRound: state.currentRound,
      roundDeadline: Number(state.roundDeadline),
      winner: state.winner as Address,
      entryFeeUsdc,
      roundDurationSeconds: Number(config.roundDuration ?? 60),
    };
  } catch {
    // Pool doesn't exist or RPC error — return empty state
    return {
      survivorsCount: 0,
      playerCount: 0,
      maxCapacity: 0,
      isUserIn: false,
      hasWon: false,
      currentStake: 0,
      potentialPayout: 0,
      poolStatus: PoolStatus.PENDING,
      currentRound: 0,
      roundDeadline: 0,
      winner: "0x0000000000000000000000000000000000000000",
      entryFeeUsdc: 0,
    };
  }
}

/**
 * Fetch the total number of pools ever created.
 */
export async function fetchPoolCount(): Promise<bigint> {
  return readContract(wagmiConfig, {
    address: ARENA_MANAGER,
    abi: arenaManagerAbi,
    functionName: "poolCount",
    args: [],
  });
}

/** Max pools to scan when resolving "my arenas" (host or player). */
const MAX_POOLS_FOR_USER = 50;

/**
 * Fetch pool IDs where the given address is host or has joined (active or eliminated).
 */
export async function fetchPoolsForUser(address: Address): Promise<bigint[]> {
  const total = await fetchPoolCount();
  const count = Number(total);
  if (!count) return [];

  const ids = Array.from(
    { length: Math.min(count, MAX_POOLS_FOR_USER) },
    (_, i) => BigInt(i + 1)
  );

  const results = await Promise.all(
    ids.map(async (id) => {
      const [config, playerInfo] = await Promise.all([
        readContract(wagmiConfig, {
          address: ARENA_MANAGER,
          abi: arenaManagerAbi,
          functionName: "getPoolConfig",
          args: [id],
        }),
        readContract(wagmiConfig, {
          address: ARENA_MANAGER,
          abi: arenaManagerAbi,
          functionName: "getPlayerInfo",
          args: [id, address],
        }),
      ]);
      const isHost =
        (config.host as string).toLowerCase() === address.toLowerCase();
      const hasParticipated =
        playerInfo.isActive || Number(playerInfo.roundEliminated) > 0;
      return { id, include: isHost || hasParticipated };
    })
  );

  return results.filter((r) => r.include).map((r) => r.id);
}

// ─── Global stats (on-chain aggregation) ─────────────────────────────────────

export interface GlobalStats {
  networkLoad: "low" | "medium" | "high";
  gasPrice: number;
  gasCurrency: string;
  globalPoolTotal: number;
  liveSurvivors: number;
  totalPools: number;
}

/**
 * Aggregate stats across all pools by reading on-chain state.
 */
export async function fetchGlobalStats(): Promise<GlobalStats> {
  const total = await fetchPoolCount();
  const count = Number(total);

  if (!count) {
    return {
      networkLoad: "low",
      gasPrice: 0.01,
      gasCurrency: "GWEI",
      globalPoolTotal: 0,
      liveSurvivors: 0,
      totalPools: 0,
    };
  }

  // Read state for all pools in parallel
  const ids = Array.from({ length: count }, (_, i) => BigInt(i + 1));
  const states = await Promise.all(
    ids.map((id) =>
      readContract(wagmiConfig, {
        address: ARENA_MANAGER,
        abi: arenaManagerAbi,
        functionName: "getPoolState",
        args: [id],
      })
    )
  );

  let globalPoolTotal = 0;
  let liveSurvivors = 0;

  for (const state of states) {
    globalPoolTotal += Number(state.totalDeposited) / 1e6;
    if (state.status === PoolStatus.ACTIVE || state.status === PoolStatus.RESOLVING) {
      liveSurvivors += state.survivorCount;
    }
  }

  const load: GlobalStats["networkLoad"] =
    count > 20 ? "high" : count > 5 ? "medium" : "low";

  return {
    networkLoad: load,
    gasPrice: 0.01,
    gasCurrency: "GWEI",
    globalPoolTotal,
    liveSurvivors,
    totalPools: count,
  };
}

// ─── Utilities ────────────────────────────────────────────────────────────────

export function parseEvmError(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message;
    if (msg.includes("User rejected") || msg.includes("user rejected"))
      return "Transaction rejected in wallet.";
    if (msg.includes("insufficient funds"))
      return "Insufficient funds for gas.";
    if (msg.includes("InvalidConfig"))
      return "Invalid pool configuration — check fee and player limits.";
    if (msg.includes("AlreadyJoined"))
      return "You have already joined this pool.";
    if (msg.includes("PoolFull"))
      return "This pool is full.";
    if (msg.includes("StartDeadlinePassed"))
      return "The pool start deadline has passed.";
    if (msg.includes("NotWinner"))
      return "Only the winner can claim winnings.";
    if (msg.includes("NothingToClaim"))
      return "Nothing left to claim.";
    if (msg.includes("AlreadySubmitted"))
      return "You already submitted a choice this round.";
    if (msg.includes("RoundDeadlinePassed"))
      return "The round deadline has passed — wait for round resolution.";
    if (msg.includes("MinPlayersNotMet"))
      return "Not enough players to start the game.";
    if (msg.includes("InsufficientCreatorStake"))
      return "You need at least 4 USDC creator stake to create pools. Deposit first.";
    return msg;
  }
  return "Transaction failed. Please try again.";
}

export function estimateGasFee(): number {
  // Arbitrum is very cheap — ~0.0001 ETH per typical tx
  return 0.0001;
}

export function formatFeeDisplay(fee: number): string {
  return `~${fee.toFixed(4)} ETH`;
}

export function formatTotalCostDisplay(
  stakeAmount: number,
  currency: string,
  fee: number
): string {
  if (currency === "ETH") {
    return `${(stakeAmount + fee).toFixed(4)} ETH`;
  }
  return `${stakeAmount.toFixed(2)} ${currency} + ${formatFeeDisplay(fee)}`;
}
