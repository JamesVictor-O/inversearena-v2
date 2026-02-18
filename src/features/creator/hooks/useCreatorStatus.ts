"use client";

import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";

import { fetchCreatorStatus } from "@/lib/contracts";
import { useWallet } from "@/features/wallet/useWallet";

/** Minimum creator stake in USDC (must match contract MIN_CREATOR_STAKE). */
export const MIN_CREATOR_STAKE_USDC = 4;

export function useCreatorStatus() {
  const { address, status: walletStatus } = useWallet();
  const enabled = walletStatus === "connected" && !!address;

  const query = useQuery({
    queryKey: ["creatorStatus", address],
    queryFn: () => fetchCreatorStatus(address as Address),
    enabled,
    staleTime: 10_000,
  });

  const stake = query.data?.stake ?? 0;
  const activePools = query.data?.activePools ?? 0;
  const hasEnoughStake = stake >= MIN_CREATOR_STAKE_USDC;

  return {
    ...query,
    stake,
    activePools,
    hasEnoughStake,
    isLoading: query.isLoading && enabled,
  };
}
