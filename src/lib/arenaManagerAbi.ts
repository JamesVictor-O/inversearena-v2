// Auto-generated from contracts/out/ArenaManager.sol/ArenaManager.json
// Do not edit manually — re-run: forge build && scripts/extract-abi.sh

export const arenaManagerAbi = [
  {
    type: "function",
    name: "createPool",
    inputs: [
      { name: "entryFee", type: "uint256" },
      { name: "maxPlayers", type: "uint32" },
      { name: "minPlayers", type: "uint32" },
      { name: "roundDuration", type: "uint32" },
      { name: "startDeadline", type: "uint32" },
    ],
    outputs: [{ name: "poolId", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "joinPool",
    inputs: [{ name: "poolId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "startGame",
    inputs: [{ name: "poolId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "cancelPool",
    inputs: [{ name: "poolId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "submitChoice",
    inputs: [
      { name: "poolId", type: "uint256" },
      { name: "choice", type: "uint8" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "resolveRound",
    inputs: [{ name: "poolId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claimWinnings",
    inputs: [{ name: "poolId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claimRefund",
    inputs: [{ name: "poolId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getPoolConfig",
    inputs: [{ name: "poolId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "host", type: "address" },
          { name: "entryFee", type: "uint256" },
          { name: "maxPlayers", type: "uint32" },
          { name: "minPlayers", type: "uint32" },
          { name: "roundDuration", type: "uint32" },
          { name: "startDeadline", type: "uint32" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getPoolState",
    inputs: [{ name: "poolId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "status", type: "uint8" },
          { name: "currentRound", type: "uint32" },
          { name: "survivorCount", type: "uint32" },
          { name: "playerCount", type: "uint32" },
          { name: "totalDeposited", type: "uint256" },
          { name: "roundDeadline", type: "uint256" },
          { name: "winner", type: "address" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getPlayerInfo",
    inputs: [
      { name: "poolId", type: "uint256" },
      { name: "player", type: "address" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "isActive", type: "bool" },
          { name: "hasClaimed", type: "bool" },
          { name: "roundEliminated", type: "uint32" },
          { name: "lastChoice", type: "uint8" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getPlayers",
    inputs: [{ name: "poolId", type: "uint256" }],
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "pendingPayout",
    inputs: [{ name: "poolId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "poolCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "usdc",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "rwaAdapter",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "PoolCreated",
    inputs: [
      { name: "poolId", type: "uint256", indexed: true },
      { name: "host", type: "address", indexed: true },
      { name: "entryFee", type: "uint256", indexed: false },
      { name: "maxPlayers", type: "uint32", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "PlayerJoined",
    inputs: [
      { name: "poolId", type: "uint256", indexed: true },
      { name: "player", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "GameStarted",
    inputs: [
      { name: "poolId", type: "uint256", indexed: true },
      { name: "playerCount", type: "uint32", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ChoiceSubmitted",
    inputs: [
      { name: "poolId", type: "uint256", indexed: true },
      { name: "player", type: "address", indexed: true },
      { name: "round", type: "uint32", indexed: false },
      { name: "choice", type: "uint8", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RoundResolved",
    inputs: [
      { name: "poolId", type: "uint256", indexed: true },
      { name: "round", type: "uint32", indexed: true },
      { name: "minorityChoice", type: "uint8", indexed: false },
      { name: "survivorsRemaining", type: "uint32", indexed: false },
      { name: "eliminated", type: "uint32", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "GameFinished",
    inputs: [
      { name: "poolId", type: "uint256", indexed: true },
      { name: "winner", type: "address", indexed: true },
      { name: "payout", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "WinningsClaimed",
    inputs: [
      { name: "poolId", type: "uint256", indexed: true },
      { name: "winner", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  // ── Creator stake ─────────────────────────────────────────────────────────
  {
    type: "function",
    name: "depositCreatorStake",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "withdrawCreatorStake",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "creatorStake",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "creatorActivePools",
    inputs: [{ name: "creator", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "CreatorStakeDeposited",
    inputs: [
      { name: "creator", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "totalStake", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "CreatorStakeWithdrawn",
    inputs: [
      { name: "creator", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "CreatorStakeSlashed",
    inputs: [
      { name: "creator", type: "address", indexed: true },
      { name: "slashedAmount", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  // Custom errors
  { type: "error", name: "InvalidConfig", inputs: [] },
  { type: "error", name: "InsufficientCreatorStake", inputs: [] },
  { type: "error", name: "PoolNotFound", inputs: [{ name: "poolId", type: "uint256" }] },
  { type: "error", name: "InvalidPoolStatus", inputs: [{ name: "current", type: "uint8" }, { name: "required", type: "uint8" }] },
  { type: "error", name: "AlreadyJoined", inputs: [{ name: "player", type: "address" }] },
  { type: "error", name: "PoolFull", inputs: [] },
  { type: "error", name: "NotActivePlayer", inputs: [] },
  { type: "error", name: "AlreadySubmitted", inputs: [] },
  { type: "error", name: "RoundDeadlinePassed", inputs: [] },
  { type: "error", name: "RoundDeadlineNotPassed", inputs: [] },
  { type: "error", name: "RoundNotOpen", inputs: [] },
  { type: "error", name: "NothingToClaim", inputs: [] },
  { type: "error", name: "NotWinner", inputs: [] },
  { type: "error", name: "StartDeadlinePassed", inputs: [] },
  { type: "error", name: "MinPlayersNotMet", inputs: [] },
  { type: "error", name: "TransferFailed", inputs: [] },
] as const;

// PoolStatus enum values
export const PoolStatus = {
  PENDING: 0,
  ACTIVE: 1,
  RESOLVING: 2,
  FINISHED: 3,
  CANCELLED: 4,
} as const;

// Choice enum values
export const Choice = {
  NONE: 0,
  HEADS: 1,
  TAILS: 2,
} as const;
