"use client";

import type { Arena } from "@/features/games/types";

interface FeaturedArenaCardProps {
    arena: Arena | null;
    isLoading?: boolean;
}

export function FeaturedArenaCard({ arena, isLoading }: FeaturedArenaCardProps) {
    if (isLoading) {
        return (
            <div className="relative flex h-full min-h-[280px] flex-col justify-center items-center font-mono border-3 border-[#1c2739] bg-black/60 p-6">
                <span className="text-xs text-zinc-500 uppercase tracking-[0.2em] animate-pulse">
                    SCANNING_ONCHAIN_ARENAS...
                </span>
            </div>
        );
    }

    if (!arena) {
        return (
            <div className="relative flex h-full min-h-[280px] flex-col justify-center items-center font-mono border-3 border-[#1c2739] bg-black/60 p-6">
                <span className="text-xs text-zinc-500 uppercase tracking-[0.2em]">
                    NO_ACTIVE_ARENAS
                </span>
                <span className="text-xs text-zinc-600 mt-2">
                    Create the first pool to get started.
                </span>
            </div>
        );
    }

    const progressPercentage = arena.maxPlayers > 0
        ? (arena.playersJoined / arena.maxPlayers) * 100
        : 0;

    const entryFee = parseFloat(arena.stake) || 0;
    const potentialPot = entryFee * arena.maxPlayers;

    return (
        <div className="relative flex h-full flex-col justify-between font-mono border-3 border-[#1c2739] bg-black/60 p-6">
            {arena.status === "ACTIVE" && (
                <div className="absolute left-6 top-6">
                    <span className="inline-flex items-center bg-primary px-2.5 py-1 text-xs font-bold tracking-wide text-black">
                        LIVE NOW
                    </span>
                </div>
            )}

            {/* Top Section */}
            <div className="mt-8">
                <div className="flex items-start justify-between">
                    <h2 className="text-3xl font-bold tracking-tight text-white">
                        ARENA {arena.number}
                    </h2>
                    <div className="text-right">
                        <div className="text-xs font-medium tracking-wider text-zinc-400">
                            CURRENT POT
                        </div>
                        <div className="text-3xl font-bold text-white">
                            {potentialPot.toLocaleString()}
                        </div>
                        <div className="text-sm font-medium text-zinc-400">
                            USDC
                        </div>
                    </div>
                </div>

                <p className="mt-4 max-w-md text-sm text-zinc-400">
                    High-stakes elimination protocol initiated. Survive the minority vote to claim the pot.
                </p>
            </div>

            {/* Bottom Section - Progress Bar and CTA */}
            <div className="mt-auto pt-8">
                <div className="flex items-end justify-between gap-6">
                    {/* Players Progress */}
                    <div className="flex-1">
                        <div className="mb-2 flex items-center justify-between text-sm">
                            <span className="font-semibold tracking-wider text-zinc-300">
                                PLAYERS
                            </span>
                            <span className="font-mono text-zinc-300">
                                <span className="text-[#37FF1C]">{arena.playersJoined}</span>
                                <span className="text-zinc-500"> / {arena.maxPlayers}</span>
                            </span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden bg-zinc-800">
                            <div
                                className="h-full bg-[#37FF1C] transition-all duration-500"
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </div>
                        <div className="mt-1.5 flex gap-1">
                            <span className="size-1.5 rounded-full bg-[#37FF1C]" />
                            <span className="size-1.5 rounded-full bg-[#37FF1C]" />
                            <span className="size-1.5 rounded-full bg-[#37FF1C]" />
                        </div>
                    </div>

                    {/* JOIN NOW Button */}
                    <a
                        href={`/arena?pool=${arena.id}`}
                        className="flex items-center gap-2 rounded-md bg-[#37FF1C] px-6 py-3 text-sm font-bold text-black transition-all hover:bg-[#2be012] hover:shadow-lg hover:shadow-[#37FF1C]/20 focus:outline-none focus:ring-2 focus:ring-[#37FF1C] focus:ring-offset-2 focus:ring-offset-black"
                    >
                        <svg
                            className="size-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2.5}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M13 10V3L4 14h7v7l9-11h-7z"
                            />
                        </svg>
                        JOIN NOW
                    </a>
                </div>
            </div>
        </div>
    );
}
