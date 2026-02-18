import type { Address } from 'viem';

export type WalletStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface WalletState {
  status: WalletStatus;
  address: Address | null;
  chainId: number | null;
  error: string | null;
}

export interface WalletContextType extends WalletState {
  connect: () => void;
  disconnect: () => void;
}
