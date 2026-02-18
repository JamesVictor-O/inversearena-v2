"use client";

import { ReactNode, useState } from "react";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@rainbow-me/rainbowkit/styles.css";

import { wagmiConfig } from "@/lib/wagmi";
import { WalletProvider } from "@/features/wallet/WalletProvider";
import { NotificationProvider } from "@/components/ui/NotificationProvider";
import { ErrorBoundary } from "@/components/error-boundary";

export function ClientProviders({ children }: { children: ReactNode }) {
    const [queryClient] = useState(() => new QueryClient());

    return (
        <WagmiProvider config={wagmiConfig}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider theme={darkTheme()}>
                    <ErrorBoundary>
                        <NotificationProvider>
                            <WalletProvider>{children}</WalletProvider>
                        </NotificationProvider>
                    </ErrorBoundary>
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
