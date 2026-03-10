import React from 'react';
import { useWalletStatus } from '@/sdk/hooks';
import { useSphereContext } from '@/sdk/context';
import { WalletPanel } from '@/components/wallet/WalletPanel';
import { UnlockWallet } from '@/components/wallet/UnlockWallet';
import { PlanetBackground } from '@/components/ui/PlanetBackground';

export function PopupApp() {
  const { walletExists, isLoading, isUnlocked } = useWalletStatus();
  const ctx = useSphereContext();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#060606] relative">
        <PlanetBackground />
        <div className="flex flex-col items-center gap-3 relative z-10">
          <div className="w-8 h-8 border-2 border-brand-orange border-t-transparent rounded-full animate-spin" />
          <p className="text-[#ffe2cc] text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (walletExists && !isUnlocked) {
    return (
      <div className="relative h-full">
        <PlanetBackground />
        <UnlockWallet onUnlock={ctx.unlockWallet} />
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <PlanetBackground />
      <WalletPanel />
    </div>
  );
}
