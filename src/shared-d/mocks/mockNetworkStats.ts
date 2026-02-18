// Re-exports on-chain stats so existing imports keep working.
// The old mock data has been replaced with real contract reads.

export type { GlobalStats as NetworkStats } from "@/lib/contracts";
export { fetchGlobalStats as fetchNetworkStats } from "@/lib/contracts";
