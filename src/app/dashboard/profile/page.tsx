"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useWallet } from "@/features/wallet/useWallet";
import { useCreatorStatus } from "@/features/creator/hooks/useCreatorStatus";
import { useProfileArenas } from "@/features/profile/hooks/useProfileArenas";
import type { ProfileArenaStatus } from "@/features/profile/hooks/useProfileArenas";

function shortenAddress(addr: string) {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function ProfilePage() {
  const [arenaFilter, setArenaFilter] = useState<"All" | "Live">("All");

  const { address, status: walletStatus } = useWallet();
  const { stake, activePools, isLoading: creatorLoading } = useCreatorStatus();
  const { arenas, history, isLoading: arenasLoading } = useProfileArenas();

  const filteredArenas =
    arenaFilter === "All"
      ? arenas
      : arenas.filter((a) => a.status === "LIVE");

  const agentId = address ? shortenAddress(address) : null;
  const isConnected = walletStatus === "connected";

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Agent Header Card */}
      <section className="relative overflow-hidden border-[1.5px] border-neon-green/30 bg-black/40 backdrop-blur-sm p-6 md:p-8">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <div className="text-[120px] font-bold leading-none select-none -mr-8 -mt-8 font-mono">
            ID
          </div>
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-8">
          <div className="w-24 h-24 md:w-32 md:h-32 bg-neon-green flex items-center justify-center shrink-0">
            <svg
              className="w-12 h-12 md:w-16 md:h-16 text-black"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>

          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl md:text-3xl font-extralight tracking-tighter family-mono uppercase">
                AGENT_ID:{" "}
                <span className="text-neon-green">
                  {isConnected && agentId ? agentId : "Connect wallet"}
                </span>
              </h2>
              {address && (
                <button
                  className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 transition-colors"
                  onClick={() => address && navigator.clipboard.writeText(address)}
                  title="Copy address"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold font-mono">
                  TOTAL SURVIVAL TIME:
                </span>
                <span className="text-sm font-mono text-white">
                  — (on-chain stats only)
                </span>
              </div>
              <div className="flex gap-2">
                <span className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-zinc-300 text-[10px] font-bold uppercase tracking-wider">
                  RANK: —
                </span>
                <span className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-zinc-300 text-[10px] font-bold uppercase tracking-wider">
                  LEVEL —
                </span>
              </div>
            </div>
          </div>

          <Button
            variant="secondary"
            className="w-full md:w-auto mt-4 md:mt-0 border-neon-green/50 text-neon-green hover:bg-neon-green/10"
          >
            EDIT PROFILE
          </Button>
        </div>
      </section>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Active Stake - on-chain creator stake (USDC) */}
        <div className="p-6 border border-white/5 bg-black/20 backdrop-blur-sm space-y-6">
          <div className="flex justify-between items-start">
            <h4 className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase">
              ACTIVE_STAKE.SYS
            </h4>
            {isConnected && (
              <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
            )}
          </div>
          <div>
            <div className="text-3xl font-extralight text-white font-mono tracking-tighter">
              {!isConnected
                ? "—"
                : creatorLoading
                  ? "..."
                  : `${stake.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`}
            </div>
            <div className="text-[10px] text-neon-green font-mono uppercase tracking-widest mt-1">
              CREATOR STAKE (ON-CHAIN)
            </div>
          </div>
          <Link href="/dashboard">
            <Button
              variant="secondary"
              className="w-full h-10 text-[10px] tracking-widest uppercase border-white/10 hover:bg-white/5"
            >
              MANAGE STAKE
            </Button>
          </Link>
        </div>

        {/* Total Yield Earned - no on-chain total; show 0 or claim from pools */}
        <div className="p-6 border-[1.5px] border-neon-pink bg-black/40 backdrop-blur-sm space-y-6 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-neon-pink/10 blur-2xl group-hover:bg-neon-pink/20 transition-all" />
          <div className="flex justify-between items-start">
            <h4 className="text-[10px] font-bold tracking-[0.2em] text-neon-pink uppercase">
              YIELD_TOTAL_EARNED
            </h4>
          </div>
          <div>
            <div className="text-3xl font-extralight text-white font-mono tracking-tighter">
              {!isConnected ? "—" : "0.00 USDC"}
            </div>
            <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mt-1">
              CLAIM WINNINGS PER POOL (GAMES PAGE)
            </div>
          </div>
          <Link href="/dashboard/games">
            <Button className="w-full h-10 text-[10px] tracking-widest uppercase bg-neon-pink hover:bg-neon-pink/90 text-white border-none">
              VIEW GAMES
            </Button>
          </Link>
        </div>

        {/* Arenas Hosted - on-chain creatorActivePools */}
        <div className="p-6 border border-white/5 bg-black/20 backdrop-blur-sm space-y-6">
          <div className="flex justify-between items-start">
            <h4 className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase">
              ARENAS_HOSTED.DATA
            </h4>
          </div>
          <div>
            <div className="text-3xl font-extralight text-white font-mono tracking-tighter">
              {!isConnected
                ? "—"
                : creatorLoading
                  ? "..."
                  : activePools}
            </div>
            <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mt-1">
              ACTIVE HOSTED (ON-CHAIN)
            </div>
          </div>
          <Link href="/dashboard">
            <Button
              variant="secondary"
              className="w-full h-10 text-[10px] tracking-widest uppercase border-white/10 hover:bg-white/5"
            >
              HOST NEW ARENA
            </Button>
          </Link>
        </div>
      </div>

      {/* Bottom Content - 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* My Arenas Table - on-chain */}
        <div className="border border-white/5 bg-black/20 p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold tracking-[0.2em] text-zinc-400 uppercase">
              MY_ARENAS.DAT
            </h3>
            <div className="flex bg-black/40 border border-white/10 p-1">
              {(["All", "Live"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setArenaFilter(filter)}
                  className={`px-4 py-1 text-[10px] uppercase tracking-widest font-bold transition-all ${
                    arenaFilter === filter
                      ? "bg-neon-green text-black"
                      : "text-zinc-500 hover:text-white"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-[11px] uppercase tracking-wider">
              <thead>
                <tr className="text-zinc-500 border-b border-white/5">
                  <th className="pb-4 font-bold">ARENA / ID</th>
                  <th className="pb-4 font-bold">STAKE</th>
                  <th className="pb-4 font-bold text-center">PARTICIPANTS</th>
                  <th className="pb-4 font-bold text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {!isConnected ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-zinc-500">
                      Connect wallet to see your arenas
                    </td>
                  </tr>
                ) : arenasLoading ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-zinc-500">
                      Loading...
                    </td>
                  </tr>
                ) : filteredArenas.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-zinc-500">
                      No arenas yet
                    </td>
                  </tr>
                ) : (
                  filteredArenas.map((arena) => (
                    <tr
                      key={arena.id}
                      className="group hover:bg-white/5 transition-colors"
                    >
                      <td className="py-4">
                        <div className="text-white font-bold">{arena.name}</div>
                        <div className="text-[9px] text-zinc-600 mt-1">
                          #{arena.poolId}
                        </div>
                      </td>
                      <td className="py-4 text-zinc-300">{arena.stake}</td>
                      <td className="py-4 text-center text-zinc-300">
                        {arena.participants}
                      </td>
                      <td className="py-4 text-right">
                        <StatusBadge status={arena.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* History Panel - on-chain finished games */}
        <div className="border border-white/5 bg-black/20 p-6">
          <h3 className="text-sm font-bold tracking-[0.2em] text-zinc-400 uppercase mb-6">
            HISTORY_LOG.V3
          </h3>
          <div className="space-y-4">
            {!isConnected ? (
              <p className="text-[10px] text-zinc-500">
                Connect wallet to see history
              </p>
            ) : arenasLoading ? (
              <p className="text-[10px] text-zinc-500">Loading...</p>
            ) : history.length === 0 ? (
              <p className="text-[10px] text-zinc-500">
                No finished games yet
              </p>
            ) : (
              history.map((item, idx) => (
                <div
                  key={idx}
                  className="group border border-white/5 bg-black/20 p-4 hover:border-white/10 transition-all flex justify-between items-center"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-zinc-500">
                        ARENA {item.arena}
                      </span>
                      <span className="text-[10px] text-zinc-600">|</span>
                      <span className="text-[10px] text-zinc-400">
                        {item.stake} • {item.rounds}
                      </span>
                    </div>
                    <div
                      className={`text-xs font-bold ${item.success ? "text-neon-green" : "text-neon-pink"}`}
                    >
                      {item.pnl}
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-[9px] font-bold tracking-widest px-2 py-1 ${
                        item.success
                          ? "bg-neon-green/10 text-neon-green"
                          : "bg-neon-pink/10 text-neon-pink"
                      }`}
                    >
                      {item.result}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ProfileArenaStatus }) {
  const classes =
    status === "LIVE"
      ? "text-neon-green bg-neon-green/10"
      : status === "SETTLING"
        ? "text-neon-pink bg-neon-pink/10"
        : "text-zinc-500 bg-white/5";
  return (
    <span className={`px-2 py-0.5 text-[9px] font-bold ${classes}`}>
      {status}
    </span>
  );
}
