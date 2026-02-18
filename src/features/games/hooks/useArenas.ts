"use client";

import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";

import { fetchArenaState, fetchPoolCount } from "@/lib/contracts";
import { PoolStatus } from "@/lib/arenaManagerAbi";
import { useWallet } from "@/features/wallet/useWallet";
import type { Arena } from "../types";

const ROUND_LABELS: Record<number, string> = {
  30: "30S",
  60: "1M",
  300: "5M",
};

// Map on-chain arena state into the UI-facing Arena type
function mapArena(
  id: bigint,
  state: Awaited<ReturnType<typeof fetchArenaState>>,
  isFeatured: boolean
): Arena {
  const status: Arena["status"] =
    state.poolStatus === PoolStatus.FINISHED
      ? "CLOSED"
      : state.poolStatus === PoolStatus.PENDING
      ? "PENDING"
      : "ACTIVE";

  const roundLabel = ROUND_LABELS[state.roundDurationSeconds ?? 60] ?? "1M";

  return {
    id: id.toString(),
    number: `#${id.toString()}`,
    playersJoined: state.playerCount,
    maxPlayers: state.maxCapacity,
    roundSpeed: roundLabel,
    stake: `${state.entryFeeUsdc.toFixed(2)} USDC`,
    poolYield: "+8.4% APY", // placeholder until RWA vault is wired
    status,
    isFeatured,
  };
}

export function useArenas(limit: number = 5) {
  const { address } = useWallet();
  const viewer = (address ?? "0x0000000000000000000000000000000000000000") as Address;

  return useQuery<Arena[]>({
    queryKey: ["arenas", { viewer }],
    queryFn: async () => {
      const total = await fetchPoolCount();
      const count = Number(total);
      if (!count || Number.isNaN(count)) return [];

      const useCount = Math.min(count, limit);
      const start = count - useCount + 1;
      const ids = Array.from({ length: useCount }, (_, i) => BigInt(start + i));

      const arenas = await Promise.all(
        ids.map(async (id, index) => {
          const state = await fetchArenaState(id, viewer);
          const isFeatured = index === 0;
          return mapArena(id, state, isFeatured);
        })
      );

      return arenas.reverse(); // newest first
    },
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
}

