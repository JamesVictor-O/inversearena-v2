'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from '@/components/ui/Button';

const shortAddress = (address: string) =>
  `${address.slice(0, 6)}...${address.slice(-4)}`;

export const ConnectWalletButton = ({ className }: { className?: string }) => {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const connected = mounted && account && chain;

        if (!mounted) {
          return <div aria-hidden="true" style={{ opacity: 0, pointerEvents: 'none', userSelect: 'none' }} />;
        }

        if (!connected) {
          return (
            <Button onClick={openConnectModal} variant={className ? 'none' : 'primary'} className={className}>
              Connect Wallet
            </Button>
          );
        }

        if (chain.unsupported) {
          return (
            <Button onClick={openChainModal} variant="none" className="text-red-400 border border-red-400 rounded px-3 py-1.5 text-sm">
              Wrong Network
            </Button>
          );
        }

        return (
          <div className="flex items-center gap-3">
            <button
              onClick={openChainModal}
              className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white transition-colors"
            >
              {chain.hasIcon && chain.iconUrl && (
                <img src={chain.iconUrl} alt={chain.name} className="w-4 h-4 rounded-full" />
              )}
              {chain.name}
            </button>
            <Button onClick={openAccountModal} variant={className ? 'none' : 'primary'} className={className}>
              {shortAddress(account.address)}
            </Button>
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
};
