'use client';

import { createContext, ReactNode, useMemo } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { WalletContextType } from './types';

export const WalletContext = createContext<WalletContextType | null>(null);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const { address, isConnected, isConnecting, chainId } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { disconnect } = useDisconnect();
  const { error: connectError } = useConnect();

  const status = useMemo(() => {
    if (isConnecting) return 'connecting';
    if (isConnected) return 'connected';
    if (connectError) return 'error';
    return 'disconnected';
  }, [isConnected, isConnecting, connectError]);

  const contextValue: WalletContextType = useMemo(
    () => ({
      status,
      address: address ?? null,
      chainId: chainId ?? null,
      error: connectError?.message ?? null,
      connect: () => openConnectModal?.(),
      disconnect: () => disconnect(),
    }),
    [status, address, chainId, connectError, openConnectModal, disconnect]
  );

  return <WalletContext.Provider value={contextValue}>{children}</WalletContext.Provider>;
};