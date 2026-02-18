"use client";

import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";

import {
  fetchPoolsForUser,
  fetchArenaState,
} from "@/lib/contracts";
import { PoolStatus } from "@/lib/arenaManagerAbi";
import { useWallet } from "@/features/wallet/useWallet";

export type ProfileArenaStatus = "LIVE" | "SETTLING" | "COMPLETED" | "PENDING";

export interface ProfileArenaRow {
  id: string;
  poolId: number;
  name: string;
  stake: string;
  participants: string;
  status: ProfileArenaStatus;
}

export interface ProfileHistoryRow {
  arena: string;
  stake: string;
  rounds: string;
  result: "SURVIVED" | "ELIMINATED";
  pnl: string;
  success: boolean;
}

function statusFromPoolStatus(s: number): ProfileArenaStatus {
  switch (s) {
    case PoolStatus.PENDING:
      return "PENDING";
    case PoolStatus.ACTIVE:
      return "LIVE";
    case PoolStatus.RESOLVING:
      return "SETTLING";
    case PoolStatus.FINISHED:
      return "COMPLETED";
    default:
      return "PENDING";
  }
}

export function useProfileArenas() {
  const { address, status: walletStatus } = useWallet();
  const enabled = walletStatus === "connected" && !!address;

  const query = useQuery({
    queryKey: ["profileArenas", address],
    queryFn: async (): Promise<{
      arenas: ProfileArenaRow[];
      history: ProfileHistoryRow[];
    }> => {
      const addr = address as Address;
      const poolIds = await fetchPoolsForUser(addr);
      if (poolIds.length === 0) return { arenas: [], history: [] };

      const states = await Promise.all(
        poolIds.map((id) => fetchArenaState(id, addr))
      );

      const arenas: ProfileArenaRow[] = [];
      const history: ProfileHistoryRow[] = [];

      poolIds.forEach((id, i) => {
        const state = states[i];
        const poolId = Number(id);
        const name = `Arena #${poolId}`;
        const stake = `${state.entryFeeUsdc.toFixed(2)} USDC`;
        const participants = `${state.playerCount}/${state.maxCapacity}`;
        const status = statusFromPoolStatus(state.poolStatus);

        arenas.push({
          id: id.toString(),
          poolId,
          name,
          stake,
          participants,
          status,
        });

        if (state.poolStatus === PoolStatus.FINISHED) {
          const rounds = `${state.currentRound} Rounds`;
          const success = state.hasWon;
          const result = success ? "SURVIVED" : "ELIMINATED";
          const pnlUsdc = success ? state.potentialPayout : -state.entryFeeUsdc;
          const pnl =
            pnlUsdc >= 0
              ? `+${pnlUsdc.toFixed(1)} USDC`
              : `${pnlUsdc.toFixed(1)} USDC`;
          history.push({
            arena: `#${poolId}`,
            stake,
            rounds,
            result,
            pnl,
            success,
          });
        }
      });

      history.sort((a, b) => {
        const na = parseInt(a.arena.slice(1), 10);
        const nb = parseInt(b.arena.slice(1), 10);
        return nb - na;
      });

      return { arenas, history };
    },
    enabled,
    staleTime: 15_000,
  });

  return {
    ...query,
    arenas: query.data?.arenas ?? [],
    history: query.data?.history ?? [],
    isLoading: query.isLoading && enabled,
  };
}
