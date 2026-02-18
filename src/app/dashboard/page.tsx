"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FeaturedArenaCard } from "@/features/dashboard-home/components/FeaturedArenaCard";
import { YieldGeneratorPanel } from "@/features/dashboard-home/components/YieldGeneratorPanel";
import {
  QuickActionTile,
  PlusIcon,
  GridIcon,
} from "@/features/dashboard-home/components/QuickActionTile";
import { GlobalIntelTicker } from "@/features/dashboard-home/components/GlobalIntelTicker";
import { RecentGames } from "@/features/dashboard-home/components/RecentGames";
import { Announcements } from "@/features/dashboard-home/components/Announcements";
import { MetricsPanel } from "@/features/dashboard-home/components/MetricsPanel";
import { PoolCreationModal } from "@/components/modals/PoolCreationModal";
import StakeModal from "@/components/modals/StakeModal";
import TelemetryPage from "@/app/dashboard/telemetry-bar/page";

import { useArenas } from "@/features/games/hooks/useArenas";
import { useCreatorStatus } from "@/features/creator/hooks/useCreatorStatus";
import { usePolling } from "@/shared-d/hooks/usePolling";
import { fetchGlobalStats } from "@/lib/contracts";
import { activeAnnouncement } from "@/features/dashboard-home/mockHome";

export default function DashboardHomePage() {
  const queryClient = useQueryClient();
  const [isStakeModalOpen, setIsStakeModalOpen] = useState(false);
  const [isPoolModalOpen, setIsPoolModalOpen] = useState(false);

  const { hasEnoughStake } = useCreatorStatus();
  const { data: arenas, status: arenasStatus } = useArenas(5);
  const { data: globalStats } = usePolling(fetchGlobalStats, {
    intervalMs: 15_000,
    enabled: true,
  });

  const featuredArena = arenas?.[0] ?? null;
  const arenasLoading = arenasStatus === "pending";

  const handleCreateArenaClick = () => {
    if (hasEnoughStake) {
      setIsPoolModalOpen(true);
    } else {
      setIsStakeModalOpen(true);
    }
  };

  const handleStakeSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["creatorStatus"] });
    setIsStakeModalOpen(false);
    setIsPoolModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <TelemetryPage
        globalPoolTotal={globalStats?.globalPoolTotal ?? 0}
        globalPoolLoading={!globalStats}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <FeaturedArenaCard arena={featuredArena} isLoading={arenasLoading} />
        </div>

        <div className="flex flex-col gap-4">
          <YieldGeneratorPanel
            globalPoolTotal={globalStats?.globalPoolTotal ?? 0}
            totalPools={globalStats?.totalPools ?? 0}
            isLoading={!globalStats}
          />

          <div className="grid grid-cols-2 gap-4">
            <QuickActionTile
              icon={<PlusIcon />}
              label="CREATE NEW ARENA"
              onClick={handleCreateArenaClick}
            />
            <QuickActionTile icon={<GridIcon />} label="BROWSE POOLS" />
          </div>
        </div>
      </div>

      <GlobalIntelTicker items={[]} />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <RecentGames games={[]} />
        <Announcements announcement={activeAnnouncement} />
        <MetricsPanel />
      </div>

      <StakeModal
        isOpen={isStakeModalOpen}
        onClose={() => setIsStakeModalOpen(false)}
        onSuccess={handleStakeSuccess}
      />

      <PoolCreationModal
        isOpen={isPoolModalOpen}
        onClose={() => setIsPoolModalOpen(false)}
        onInitialize={() => {
          queryClient.invalidateQueries({ queryKey: ["arenas"] });
          queryClient.invalidateQueries({ queryKey: ["creatorStatus"] });
          setIsPoolModalOpen(false);
        }}
      />
    </div>
  );
}
