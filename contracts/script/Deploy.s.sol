// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {RWAAdapter} from "../src/RWAAdapter.sol";
import {ArenaManager} from "../src/ArenaManager.sol";

/// @notice Full deployment script for Inverse Arena.
///
///         Deploy order:
///         1. RWAAdapter  (needs: usdc, vault, owner)
///         2. ArenaManager (needs: usdc, rwaAdapter, owner)
///         3. RWAAdapter.setArenaManager(arenaManager)
///
///         Environment variables
///         ---------------------
///         PRIVATE_KEY              — deployer EOA
///         USDC_ADDRESS             — USDC on target chain
///         RWA_VAULT_ADDRESS        — ERC4626 vault; set to address(0) for mock mode
///         DEPLOYER_ADDRESS         — (optional) address to use as owner; defaults to sender
///
///         Usage
///         -----
///         forge script script/Deploy.s.sol \
///           --rpc-url $ARBITRUM_SEPOLIA_RPC_URL \
///           --broadcast \
///           --verify \
///           -vvvv
contract Deploy is Script {
    function run() external {
        uint256 deployerKey  = vm.envUint("PRIVATE_KEY");
        address usdc         = vm.envAddress("USDC_ADDRESS");
        address vault        = vm.envOr("RWA_VAULT_ADDRESS", address(0));
        address deployer     = vm.addr(deployerKey);

        console2.log("Deployer         :", deployer);
        console2.log("USDC             :", usdc);
        console2.log("Vault            :", vault == address(0) ? "MOCK (no yield)" : vm.toString(vault));

        vm.startBroadcast(deployerKey);

        // ── 1. Deploy RWAAdapter ─────────────────────────────────────────────
        RWAAdapter adapter = new RWAAdapter(usdc, vault, deployer);
        console2.log("RWAAdapter       :", address(adapter));

        // ── 2. Deploy ArenaManager ───────────────────────────────────────────
        ArenaManager manager = new ArenaManager(usdc, address(adapter), deployer);
        console2.log("ArenaManager     :", address(manager));

        // ── 3. Wire up ───────────────────────────────────────────────────────
        adapter.setArenaManager(address(manager));
        console2.log("ArenaManager set on RWAAdapter");

        vm.stopBroadcast();

        // Summary
        console2.log("\n=== Deployment Summary ===");
        console2.log("Network          :", block.chainid);
        console2.log("RWAAdapter       :", address(adapter));
        console2.log("ArenaManager     :", address(manager));
        console2.log("Owner            :", deployer);
    }
}
