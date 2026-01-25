/**
 * Zustand store for popup state management.
 */

import { create } from 'zustand';
import type {
  WalletState,
  IdentityInfo,
  TokenBalance,
  PendingTransaction,
} from '@/shared/types';

export type View =
  | 'loading'
  | 'create-wallet'
  | 'import-wallet'
  | 'unlock'
  | 'dashboard'
  | 'send'
  | 'receive'
  | 'identities'
  | 'settings'
  | 'pending-transactions';

interface PopupState {
  // Wallet state
  walletState: WalletState | null;
  activeIdentity: IdentityInfo | null;
  identities: IdentityInfo[];
  balances: TokenBalance[];
  pendingTransactions: PendingTransaction[];

  // UI state
  view: View;
  loading: boolean;
  error: string | null;

  // Actions
  setWalletState: (state: WalletState) => void;
  setActiveIdentity: (identity: IdentityInfo | null) => void;
  setIdentities: (identities: IdentityInfo[]) => void;
  setBalances: (balances: TokenBalance[]) => void;
  setPendingTransactions: (transactions: PendingTransaction[]) => void;
  setView: (view: View) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  walletState: null,
  activeIdentity: null,
  identities: [],
  balances: [],
  pendingTransactions: [],
  view: 'loading' as View,
  loading: true,
  error: null,
};

export const useStore = create<PopupState>((set) => ({
  ...initialState,

  setWalletState: (walletState) => set({ walletState }),
  setActiveIdentity: (activeIdentity) => set({ activeIdentity }),
  setIdentities: (identities) => set({ identities }),
  setBalances: (balances) => set({ balances }),
  setPendingTransactions: (pendingTransactions) => set({ pendingTransactions }),
  setView: (view) => set({ view }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
