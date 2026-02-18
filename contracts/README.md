# <img width="40" height="40" alt="Inverse Arena Logo" src="https://github.com/user-attachments/assets/d75a1127-d4d5-4e3c-8289-3e1379552bdb" /> Inverse Arena — Smart Contracts

[![Solidity](https://img.shields.io/badge/Solidity-0.8.x-363636?style=for-the-badge&logo=solidity)](https://soliditylang.org)
[![Foundry](https://img.shields.io/badge/Built%20with-Foundry-FFDB1C?style=for-the-badge)](https://getfoundry.sh)
[![Arbitrum](https://img.shields.io/badge/Deployed%20on-Arbitrum-28A0F0?style=for-the-badge&logo=arbitrum&logoColor=white)](https://arbitrum.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](../LICENSE)

Smart contract suite for **Inverse Arena** — the RWA-powered, minority-wins elimination game built on Arbitrum.

---

## Overview

The contract layer handles three core responsibilities:

| Responsibility | Contract | Description |
|---|---|---|
| Game Logic | `ArenaManager` | Player state, round timing, elimination logic |
| Yield Integration | `RWAAdapter` | Deploys prize pool funds into yield-bearing RWA vaults |
| Fairness | `ArenaVRF` | Commit–reveal or Chainlink VRF for provably fair outcomes |

The flow:

```
Player Entry (USDC)
    └─► ArenaManager         — tracks players, rounds, eliminations
         └─► RWAAdapter      — routes idle USDC into RWA vault
              └─► Yield Vault — accrues real-world yield
                   └─► Winner Payout: Principal + Accumulated Yield
```

---

## Repository Structure

```
contracts/
├── src/                        # Production contracts
│   ├── ArenaManager.sol        # Core game logic (rounds, elimination, payouts)
│   ├── RWAAdapter.sol          # RWA / yield vault integration interface
│   ├── ArenaVRF.sol            # Randomness module (commit-reveal / VRF)
│   └── interfaces/             # Shared interfaces
│       ├── IArenaManager.sol
│       └── IRWAAdapter.sol
├── script/                     # Deployment & management scripts
│   ├── Deploy.s.sol            # Full deployment script
│   └── Configure.s.sol         # Post-deploy configuration
├── test/                       # Foundry tests
│   ├── ArenaManager.t.sol      # Unit tests — game logic
│   ├── RWAAdapter.t.sol        # Unit tests — yield adapter
│   └── integration/            # Fork tests against Arbitrum mainnet
│       └── ArenaFork.t.sol
├── lib/                        # Vendored dependencies (forge-std, etc.)
├── foundry.toml                # Foundry configuration
└── README.md                   # This file
```

> **Note:** `src/Counter.sol`, `test/Counter.t.sol`, and `script/Counter.s.sol` are Foundry boilerplate — replace them with the contracts above as you build.

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| [Foundry](https://getfoundry.sh) | latest stable | `curl -L https://foundry.paradigm.xyz \| bash` |
| [Git](https://git-scm.com) | any | system package manager |

Verify your Foundry install:

```bash
forge --version
cast --version
anvil --version
```

---

## Setup

```bash
# From the project root
cd contracts

# Install / update dependencies
forge install

# Build all contracts
forge build
```

---

## Testing

```bash
# Run all unit tests
forge test

# Run with verbose output (shows logs and traces)
forge test -vvv

# Run a specific test file
forge test --match-path test/ArenaManager.t.sol

# Run a specific test function
forge test --match-test test_MinorityWins

# Run with gas reporting
forge test --gas-report

# Fork test against Arbitrum One mainnet
forge test --match-path test/integration/ArenaFork.t.sol \
  --fork-url $ARBITRUM_RPC_URL -vvv
```

---

## Deployment

### 1. Configure environment

Copy the example env and fill in your values:

```bash
cp .env.example .env
```

```env
# .env
PRIVATE_KEY=0xYOUR_DEPLOYER_PRIVATE_KEY
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
ARBISCAN_API_KEY=YOUR_ARBISCAN_API_KEY

# Protocol addresses (set after deploy or use existing)
RWA_VAULT_ADDRESS=0x...
VRF_COORDINATOR_ADDRESS=0x...
```

### 2. Deploy to Arbitrum Sepolia (testnet)

```bash
forge script script/Deploy.s.sol \
  --rpc-url $ARBITRUM_SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  -vvvv
```

### 3. Deploy to Arbitrum One (mainnet)

```bash
forge script script/Deploy.s.sol \
  --rpc-url $ARBITRUM_RPC_URL \
  --broadcast \
  --verify \
  -vvvv
```

> Always do a dry-run first (omit `--broadcast`) to simulate the deployment.

---

## Contract Architecture

### ArenaManager

The central game contract. Manages the full pool lifecycle:

- **Pool Creation** — Host stakes to open an arena; parameters set (entry fee, max players, round duration).
- **Player Entry** — Players deposit USDC; funds are forwarded to the `RWAAdapter`.
- **Round Execution** — Each round, players submit `Heads` or `Tails`. The minority survives; the majority is eliminated.
- **Winner Payout** — Last surviving player claims `principal + accrued RWA yield`.

### RWAAdapter

A thin integration layer between the game and external yield protocols (e.g. Backed Finance, Ondo, OpenEden). It:

- Deposits idle USDC into a yield-bearing vault on game start.
- Tracks accrued yield throughout the game.
- Redeems principal + yield on game completion for winner payout.

### ArenaVRF

Ensures fair and tamper-proof round outcomes via:

- **Commit–Reveal** (low latency, no oracle dependency) — suitable for testnet / MVP.
- **Chainlink VRF v2** — production-grade randomness for mainnet.

---

## Key Commands Reference

| Command | Description |
|---|---|
| `forge build` | Compile all contracts |
| `forge test` | Run the full test suite |
| `forge test --gas-report` | Test + gas usage per function |
| `forge coverage` | Generate test coverage report |
| `forge snapshot` | Save a gas snapshot |
| `forge fmt` | Format Solidity source files |
| `cast call <addr> <sig>` | Read on-chain contract state |
| `cast send <addr> <sig>` | Send a transaction |
| `anvil` | Spin up a local Arbitrum fork |

---

## Security Considerations

- All prize pool funds are held in `ArenaManager` or delegated to the `RWAAdapter` — never to EOAs.
- Access control uses `Ownable2Step` for all privileged operations (two-step ownership transfer).
- Reentrancy guards (`ReentrancyGuard`) on all external fund-moving functions.
- Round outcomes are verifiably fair via commit–reveal or VRF — no server-side randomness.
- Contracts should be audited before mainnet deployment.

---

## Roadmap

| Phase | Status | Milestone |
|---|---|---|
| Phase 1 | ✅ | Core game logic on Arbitrum Sepolia |
| Phase 2 | ⏳ | RWA vault integration + Arbitrum One mainnet |
| Phase 3 | 🚀 | DAO-governed RWA allocation, private arenas |

---

## Related

- [Frontend](../) — Next.js app
- [Arbitrum Docs](https://docs.arbitrum.io)
- [Foundry Book](https://book.getfoundry.sh)

---

## License

MIT — see [LICENSE](../LICENSE).
