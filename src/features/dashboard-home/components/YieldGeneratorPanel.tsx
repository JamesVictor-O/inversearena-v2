"use client";

interface YieldGeneratorPanelProps {
    globalPoolTotal: number;
    totalPools: number;
    isLoading?: boolean;
}

export function YieldGeneratorPanel({ globalPoolTotal, totalPools, isLoading }: YieldGeneratorPanelProps) {
    return (
        <div className="border-3 border-[#1c2739] font-mono bg-black/60 p-5">
            {/* Header */}
            <h3 className="text-xs font-bold tracking-widest text-zinc-400">
                YIELD GENERATOR
            </h3>

            {/* Global Yield */}
            <div className="mt-3">
                <div className="text-xs font-medium tracking-wider text-zinc-500">
                    GLOBAL POOL TOTAL
                </div>
                <div className="mt-1 text-3xl font-bold text-white">
                    {isLoading ? "..." : `$${globalPoolTotal.toLocaleString()}`}
                </div>
            </div>

            {/* APY Badge */}
            <div className="mt-3 flex items-center gap-3">
                <span className="inline-flex items-center rounded border border-[#37FF1C]/30 bg-[#37FF1C]/10 px-2 py-0.5 text-xs font-bold text-[#37FF1C]">
                    +8.4% APY
                </span>
                <span className="text-xs text-zinc-500">RWA yield (T-Bills)</span>
            </div>

            {/* Pool Count */}
            <div className="mt-5 border-t border-white/5 pt-4">
                <div className="flex items-center justify-between text-xs">
                    <span className="font-medium tracking-wider text-zinc-500">
                        TOTAL POOLS
                    </span>
                    <span className="font-mono text-zinc-400">
                        {isLoading ? "..." : totalPools}
                    </span>
                </div>
            </div>
        </div>
    );
}
