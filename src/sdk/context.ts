import { createContext, useContext } from 'react';
import type { Asset, Token, TransactionHistoryEntry } from '@unicitylabs/sphere-sdk';
import type { WalletIdentity } from './types';
import type { NametagInfo, NametagResolution, PendingTransaction, AggregatorConfig } from '@/shared/types';

export interface SphereContextValue {
  // State
  walletExists: boolean;
  isUnlocked: boolean;
  isLoading: boolean;
  error: string | null;

  // Identity
  identity: WalletIdentity | null;
  nametag: string | null;

  // Wallet lifecycle
  createWallet: (password: string) => Promise<{ mnemonic: string }>;
  importWallet: (mnemonic: string, password: string) => Promise<void>;
  unlockWallet: (password: string) => Promise<void>;
  lockWallet: () => Promise<void>;
  deleteWallet: () => Promise<void>;

  // Data fetching (returns raw data, caching handled by React Query in hooks)
  getAssets: () => Promise<Asset[]>;
  getTokens: () => Promise<Token[]>;
  getTransactionHistory: () => Promise<TransactionHistoryEntry[]>;
  getIdentity: () => Promise<WalletIdentity | null>;

  // Operations
  send: (params: { coinId: string; amount: string; recipient: string; memo?: string }) => Promise<{ transactionId?: string }>;
  resolve: (recipient: string) => Promise<NametagResolution | null>;

  // Nametag
  registerNametag: (nametag: string) => Promise<NametagInfo>;
  isNametagAvailable: (nametag: string) => Promise<boolean>;
  getMyNametag: () => Promise<NametagInfo | null>;

  // Mnemonic
  getMnemonic: () => Promise<string | null>;
  exportWallet: () => Promise<string>;

  // Pending transactions (dApp)
  getPendingTransactions: () => Promise<PendingTransaction[]>;
  approveTransaction: (requestId: string) => Promise<void>;
  rejectTransaction: (requestId: string) => Promise<void>;

  // Config
  getAggregatorConfig: () => Promise<AggregatorConfig>;
  setAggregatorConfig: (config: AggregatorConfig) => Promise<void>;

  // Events
  onWalletUpdate: (callback: () => void) => () => void;
}

export const SphereContext = createContext<SphereContextValue | null>(null);

export function useSphereContext(): SphereContextValue {
  const ctx = useContext(SphereContext);
  if (!ctx) throw new Error('useSphereContext must be used within SphereProvider');
  return ctx;
}
