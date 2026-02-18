"use client";

import React from "react";
import TelemetryBar from "./telemetry-bar.component";
import {
  SystemStatus,
  ServerTelemetry,
  GlobalPoolData,
} from "./types/telemetry-bar.types";

const STATIC_SYSTEM_STATUS: SystemStatus = "operational";
const STATIC_SERVER_TELEMETRY: ServerTelemetry = {
  region: "US-EAST-1",
  latency: 24,
};

export interface TelemetryPageProps {
  /** On-chain global pool total (USDC). When provided, this is used instead of dummy data. */
  globalPoolTotal?: number;
  /** True while global stats are loading */
  globalPoolLoading?: boolean;
}

const TelemetryPage: React.FC<TelemetryPageProps> = ({
  globalPoolTotal = 0,
  globalPoolLoading = false,
}) => {
  const globalPool: GlobalPoolData = {
    value: globalPoolTotal,
    symbol: "$",
  };

  const handleNotifications = () => {
    console.log("Notifications clicked");
  };

  const handleSettings = () => {
    console.log("Settings clicked");
  };

  return (
    <div className="w-full h-auto">
      <TelemetryBar
        systemStatus={STATIC_SYSTEM_STATUS}
        serverTelemetry={STATIC_SERVER_TELEMETRY}
        globalPool={globalPool}
        onNotificationClick={handleNotifications}
        onSettingsClick={handleSettings}
        className={globalPoolLoading ? "animate-pulse" : undefined}
      />
    </div>
  );
};

export default TelemetryPage;
