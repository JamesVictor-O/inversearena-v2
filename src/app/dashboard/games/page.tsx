"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { GamesHeader } from "@/features/games/components/GamesHeader";
import { GamesStats } from "@/features/games/components/GamesStats";
import { GamesFilters } from "@/features/games/components/GamesFilters";
import { ArenaCard } from "@/features/games/components/ArenaCard";
import { useArenas } from "@/features/games/hooks/useArenas";

export default function GamesPage() {
  const searchParams = useSearchParams();
  const filter = searchParams.get("filter") || "all";
  const search = searchParams.get("q") || "";

  const { data: onchainArenas, status } = useArenas(20);
  const baseArenas = onchainArenas ?? [];

  const filteredArenas = useMemo(() => {
    let arenas = [...baseArenas];

    if (filter === "high-stakes") {
      arenas = arenas.filter(
        (arena) =>
          arena.badge === "WHALE" || parseFloat(arena.stake) > 100
      );
    } else if (filter === "fast-rounds") {
      arenas = arenas.filter(
        (arena) =>
          arena.badge === "BLITZ" || arena.roundSpeed.toLowerCase().includes("30")
      );
    }

    if (search) {
      const searchLower = search.toLowerCase();
      arenas = arenas.filter(
        (arena) =>
          arena.id.toLowerCase().includes(searchLower) ||
          arena.number.toLowerCase().includes(searchLower)
      );
    }

    return arenas;
  }, [baseArenas, filter, search]);

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex justify-between items-start mb-4">
        <GamesHeader />
        <GamesStats />
      </div>

      <GamesFilters />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 grow">
        {status === "loading" && (!onchainArenas || onchainArenas.length === 0) && (
          <div className="col-span-full text-center py-12 text-zinc-500 text-xs font-mono uppercase tracking-[0.2em]">
            SCANNING_ONCHAIN_ARENAS...
          </div>
        )}

        {filteredArenas.length > 0 ? (
          filteredArenas.map((arena) => (
            <ArenaCard key={arena.id} arena={arena} />
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <p className="text-zinc-500 text-sm uppercase tracking-wider">
              No arenas found matching your criteria
            </p>
          </div>
        )}
      </div>
    </div>
  );
}