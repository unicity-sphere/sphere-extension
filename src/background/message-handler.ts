/**
 * Background message handler - routes messages between content scripts and popup.
 *
 * Handles:
 * - SPHERE_* messages from web pages via content script
 * - POPUP_* messages from the extension popup
 * - Pending transaction management
 * - Tab tracking for transaction origins
 */

import { walletManager } from './wallet-manager';
import {
  addPendingTransaction,
  removePendingTransaction,
  getPendingTransactions,
  getPreferences,
  savePreferences,
} from './storage';
import type {
  PendingTransaction,
  SendTransactionData,
  SignMessageData,
  SignNostrData,
  IdentityInfo,
  TokenBalance,
} from '@/shared/types';

/** Connected sites (origin -> boolean) */
const connectedSites = new Map<string, boolean>();

/**
 * Handle messages from content scripts (web page requests).
 */
export async function handleContentMessage(
  message: Record<string, unknown>,
  sender: chrome.runtime.MessageSender
): Promise<unknown> {
  const type = message.type as string;
  const requestId = message.requestId as string;
  const origin = message.origin as string;

  console.log('Background received message:', type, requestId, 'from', origin);

  try {
    switch (type) {
      case 'SPHERE_CONNECT':
        return handleConnect(origin);

      case 'SPHERE_DISCONNECT':
        return handleDisconnect(origin);

      case 'SPHERE_GET_ACTIVE_IDENTITY':
        return handleGetActiveIdentity(origin);

      case 'SPHERE_GET_BALANCES':
        return handleGetBalances(origin);

      case 'SPHERE_SEND_TOKENS':
        return handleSendTokensRequest(
          requestId,
          origin,
          sender.tab?.id ?? 0,
          {
            recipient: message.recipient as string,
            coinId: message.coinId as string,
            amount: message.amount as string,
            message: message.message as string | undefined,
          }
        );

      case 'SPHERE_SIGN_MESSAGE':
        return handleSignMessageRequest(
          requestId,
          origin,
          sender.tab?.id ?? 0,
          message.message as string
        );

      case 'SPHERE_GET_NOSTR_PUBLIC_KEY':
        return handleGetNostrPublicKey(origin);

      case 'SPHERE_SIGN_NOSTR_EVENT':
        return handleSignNostrEventRequest(
          requestId,
          origin,
          sender.tab?.id ?? 0,
          message.eventHash as string
        );

      case 'SPHERE_RESOLVE_NAMETAG':
        return handleResolveNametag(origin, message.nametag as string);

      case 'SPHERE_CHECK_NAMETAG_AVAILABLE':
        return handleCheckNametagAvailable(origin, message.nametag as string);

      default:
        return {
          type: `${type}_RESPONSE`,
          success: false,
          error: `Unknown message type: ${type}`,
        };
    }
  } catch (error) {
    console.error('Background handler error:', error);
    return {
      type: `${type}_RESPONSE`,
      success: false,
      error: (error as Error).message || 'Unknown error',
    };
  }
}

/**
 * Handle messages from the popup.
 */
export async function handlePopupMessage(
  message: Record<string, unknown>
): Promise<unknown> {
  const type = message.type as string;

  console.log('Background received popup message:', type);

  try {
    switch (type) {
      case 'POPUP_GET_STATE':
        return {
          success: true,
          state: await walletManager.getState(),
        };

      case 'POPUP_CREATE_WALLET': {
        const password = message.password as string;
        const walletName = message.walletName as string | undefined;
        const identityLabel = message.identityLabel as string | undefined;
        const identity = await walletManager.createWallet(password, walletName, identityLabel);
        return {
          success: true,
          identity,
          state: await walletManager.getState(),
        };
      }

      case 'POPUP_IMPORT_WALLET': {
        const walletJson = message.walletJson as string;
        const password = message.password as string;
        const identity = await walletManager.importWallet(walletJson, password);
        return {
          success: true,
          identity,
          state: await walletManager.getState(),
        };
      }

      case 'POPUP_UNLOCK_WALLET': {
        const password = message.password as string;
        const identity = await walletManager.unlock(password);
        return {
          success: true,
          identity,
          state: await walletManager.getState(),
        };
      }

      case 'POPUP_LOCK_WALLET':
        await walletManager.lock();
        return {
          success: true,
          state: await walletManager.getState(),
        };

      case 'POPUP_GET_IDENTITIES':
        return {
          success: true,
          identities: walletManager.listIdentities(),
          activeIdentityId: walletManager.getActiveIdentity().id,
        };

      case 'POPUP_CREATE_IDENTITY': {
        const label = message.label as string;
        const identity = await walletManager.createIdentity(label);
        return {
          success: true,
          identity,
        };
      }

      case 'POPUP_SWITCH_IDENTITY': {
        const identityId = message.identityId as string;
        const identity = await walletManager.switchIdentity(identityId);
        return {
          success: true,
          identity,
        };
      }

      case 'POPUP_REMOVE_IDENTITY': {
        const identityId = message.identityId as string;
        await walletManager.removeIdentity(identityId);
        return {
          success: true,
        };
      }

      case 'POPUP_GET_BALANCES':
        return {
          success: true,
          balances: walletManager.getBalances(),
        };

      case 'POPUP_EXPORT_WALLET':
        return {
          success: true,
          walletJson: walletManager.exportWallet(),
        };

      case 'POPUP_GET_PENDING_TRANSACTIONS':
        return {
          success: true,
          transactions: await getPendingTransactions(),
        };

      case 'POPUP_APPROVE_TRANSACTION': {
        const requestId = message.requestId as string;
        return handleApproveTransaction(requestId);
      }

      case 'POPUP_REJECT_TRANSACTION': {
        const requestId = message.requestId as string;
        return handleRejectTransaction(requestId);
      }

      case 'POPUP_GET_NOSTR_PUBLIC_KEY':
        return {
          success: true,
          ...walletManager.getNostrPublicKey(),
        };

      case 'POPUP_GET_ADDRESS': {
        const address = await walletManager.getAddress();
        return {
          success: true,
          address,
        };
      }

      case 'POPUP_GET_PREFERENCES':
        return {
          success: true,
          preferences: await getPreferences(),
        };

      case 'POPUP_SAVE_PREFERENCES': {
        const preferences = message.preferences as Parameters<typeof savePreferences>[0];
        await savePreferences(preferences);
        return { success: true };
      }

      default:
        return {
          success: false,
          error: `Unknown popup message type: ${type}`,
        };
    }
  } catch (error) {
    console.error('Background popup handler error:', error);
    return {
      success: false,
      error: (error as Error).message || 'Unknown error',
    };
  }
}

// ============ SPHERE_* Message Handlers ============

async function handleConnect(origin: string): Promise<{
  type: string;
  success: boolean;
  identity?: IdentityInfo;
  error?: string;
}> {
  if (!walletManager.isUnlocked()) {
    // Need to open popup for unlock
    await openPopup();
    return {
      type: 'SPHERE_CONNECT_RESPONSE',
      success: false,
      error: 'Wallet is locked. Please unlock in the extension popup.',
    };
  }

  connectedSites.set(origin, true);
  const identity = walletManager.getActiveIdentity();

  return {
    type: 'SPHERE_CONNECT_RESPONSE',
    success: true,
    identity,
  };
}

async function handleDisconnect(origin: string): Promise<{ type: string; success: boolean }> {
  connectedSites.delete(origin);
  return {
    type: 'SPHERE_DISCONNECT_RESPONSE',
    success: true,
  };
}

async function handleGetActiveIdentity(origin: string): Promise<{
  type: string;
  success: boolean;
  identity?: IdentityInfo | null;
  error?: string;
}> {
  if (!connectedSites.has(origin)) {
    return {
      type: 'SPHERE_GET_ACTIVE_IDENTITY_RESPONSE',
      success: true,
      identity: null,
    };
  }

  if (!walletManager.isUnlocked()) {
    return {
      type: 'SPHERE_GET_ACTIVE_IDENTITY_RESPONSE',
      success: true,
      identity: null,
    };
  }

  return {
    type: 'SPHERE_GET_ACTIVE_IDENTITY_RESPONSE',
    success: true,
    identity: walletManager.getActiveIdentity(),
  };
}

async function handleGetBalances(origin: string): Promise<{
  type: string;
  success: boolean;
  balances?: TokenBalance[];
  error?: string;
}> {
  if (!connectedSites.has(origin)) {
    return {
      type: 'SPHERE_GET_BALANCES_RESPONSE',
      success: false,
      error: 'Not connected. Call connect() first.',
    };
  }

  if (!walletManager.isUnlocked()) {
    return {
      type: 'SPHERE_GET_BALANCES_RESPONSE',
      success: false,
      error: 'Wallet is locked.',
    };
  }

  return {
    type: 'SPHERE_GET_BALANCES_RESPONSE',
    success: true,
    balances: walletManager.getBalances(),
  };
}

async function handleSendTokensRequest(
  requestId: string,
  origin: string,
  tabId: number,
  params: { recipient: string; coinId: string; amount: string; message?: string }
): Promise<{ type: string; success: boolean; error?: string }> {
  if (!connectedSites.has(origin)) {
    return {
      type: 'SPHERE_SEND_TOKENS_RESPONSE',
      success: false,
      error: 'Not connected. Call connect() first.',
    };
  }

  if (!walletManager.isUnlocked()) {
    return {
      type: 'SPHERE_SEND_TOKENS_RESPONSE',
      success: false,
      error: 'Wallet is locked.',
    };
  }

  // Create pending transaction for user approval
  const tx: PendingTransaction = {
    requestId,
    type: 'send',
    origin,
    tabId,
    timestamp: Date.now(),
    data: {
      recipient: params.recipient,
      coinId: params.coinId,
      amount: params.amount,
      message: params.message,
    } as SendTransactionData,
  };

  await addPendingTransaction(tx);

  // Open popup for approval
  await openPopup();

  // Return pending - actual result will be sent via transaction result message
  return {
    type: 'SPHERE_SEND_TOKENS_RESPONSE',
    success: true,
    // transactionId will be sent later via SPHERE_TRANSACTION_RESULT
  };
}

async function handleSignMessageRequest(
  requestId: string,
  origin: string,
  tabId: number,
  message: string
): Promise<{ type: string; success: boolean; error?: string }> {
  if (!connectedSites.has(origin)) {
    return {
      type: 'SPHERE_SIGN_MESSAGE_RESPONSE',
      success: false,
      error: 'Not connected. Call connect() first.',
    };
  }

  if (!walletManager.isUnlocked()) {
    return {
      type: 'SPHERE_SIGN_MESSAGE_RESPONSE',
      success: false,
      error: 'Wallet is locked.',
    };
  }

  // Create pending transaction for user approval
  const tx: PendingTransaction = {
    requestId,
    type: 'sign_message',
    origin,
    tabId,
    timestamp: Date.now(),
    data: { message } as SignMessageData,
  };

  await addPendingTransaction(tx);
  await openPopup();

  return {
    type: 'SPHERE_SIGN_MESSAGE_RESPONSE',
    success: true,
  };
}

async function handleGetNostrPublicKey(origin: string): Promise<{
  type: string;
  success: boolean;
  publicKey?: string;
  npub?: string;
  error?: string;
}> {
  if (!connectedSites.has(origin)) {
    return {
      type: 'SPHERE_GET_NOSTR_PUBLIC_KEY_RESPONSE',
      success: false,
      error: 'Not connected. Call connect() first.',
    };
  }

  if (!walletManager.isUnlocked()) {
    return {
      type: 'SPHERE_GET_NOSTR_PUBLIC_KEY_RESPONSE',
      success: false,
      error: 'Wallet is locked.',
    };
  }

  const keys = walletManager.getNostrPublicKey();
  return {
    type: 'SPHERE_GET_NOSTR_PUBLIC_KEY_RESPONSE',
    success: true,
    publicKey: keys.hex,
    npub: keys.npub,
  };
}

async function handleSignNostrEventRequest(
  requestId: string,
  origin: string,
  tabId: number,
  eventHash: string
): Promise<{ type: string; success: boolean; error?: string }> {
  if (!connectedSites.has(origin)) {
    return {
      type: 'SPHERE_SIGN_NOSTR_EVENT_RESPONSE',
      success: false,
      error: 'Not connected. Call connect() first.',
    };
  }

  if (!walletManager.isUnlocked()) {
    return {
      type: 'SPHERE_SIGN_NOSTR_EVENT_RESPONSE',
      success: false,
      error: 'Wallet is locked.',
    };
  }

  // Create pending transaction for user approval
  const tx: PendingTransaction = {
    requestId,
    type: 'sign_nostr',
    origin,
    tabId,
    timestamp: Date.now(),
    data: { eventHash } as SignNostrData,
  };

  await addPendingTransaction(tx);
  await openPopup();

  return {
    type: 'SPHERE_SIGN_NOSTR_EVENT_RESPONSE',
    success: true,
  };
}

async function handleResolveNametag(
  origin: string,
  nametag: string
): Promise<{
  type: string;
  success: boolean;
  resolution?: { nametag: string; pubkey: string; proxyAddress: string } | null;
  error?: string;
}> {
  if (!connectedSites.has(origin)) {
    return {
      type: 'SPHERE_RESOLVE_NAMETAG_RESPONSE',
      success: false,
      error: 'Not connected. Call connect() first.',
    };
  }

  if (!walletManager.isUnlocked()) {
    return {
      type: 'SPHERE_RESOLVE_NAMETAG_RESPONSE',
      success: false,
      error: 'Wallet is locked.',
    };
  }

  try {
    const resolution = await walletManager.resolveNametag(nametag);
    return {
      type: 'SPHERE_RESOLVE_NAMETAG_RESPONSE',
      success: true,
      resolution,
    };
  } catch (error) {
    return {
      type: 'SPHERE_RESOLVE_NAMETAG_RESPONSE',
      success: false,
      error: (error as Error).message,
    };
  }
}

async function handleCheckNametagAvailable(
  origin: string,
  nametag: string
): Promise<{
  type: string;
  success: boolean;
  available?: boolean;
  error?: string;
}> {
  if (!connectedSites.has(origin)) {
    return {
      type: 'SPHERE_CHECK_NAMETAG_AVAILABLE_RESPONSE',
      success: false,
      error: 'Not connected. Call connect() first.',
    };
  }

  if (!walletManager.isUnlocked()) {
    return {
      type: 'SPHERE_CHECK_NAMETAG_AVAILABLE_RESPONSE',
      success: false,
      error: 'Wallet is locked.',
    };
  }

  try {
    // If we can't resolve it, it's available
    const resolution = await walletManager.resolveNametag(nametag);
    return {
      type: 'SPHERE_CHECK_NAMETAG_AVAILABLE_RESPONSE',
      success: true,
      available: resolution === null,
    };
  } catch (error) {
    return {
      type: 'SPHERE_CHECK_NAMETAG_AVAILABLE_RESPONSE',
      success: false,
      error: (error as Error).message,
    };
  }
}

// ============ Transaction Approval/Rejection ============

async function handleApproveTransaction(requestId: string): Promise<{ success: boolean; error?: string }> {
  const tx = await removePendingTransaction(requestId);

  if (!tx) {
    return { success: false, error: 'Transaction not found' };
  }

  try {
    let result: unknown;

    switch (tx.type) {
      case 'send': {
        const data = tx.data as SendTransactionData;
        result = await walletManager.sendAmount(data.coinId, data.amount, data.recipient);
        break;
      }

      case 'sign_message': {
        const data = tx.data as SignMessageData;
        const signature = walletManager.signMessageWithIdentity(data.message);
        result = { signature };
        break;
      }

      case 'sign_nostr': {
        const data = tx.data as SignNostrData;
        const signature = walletManager.signNostrEventHash(data.eventHash);
        result = { signature };
        break;
      }
    }

    // Send result to content script
    await sendToTab(tx.tabId, {
      type: 'SPHERE_TRANSACTION_RESULT',
      requestId,
      success: true,
      result,
    });

    return { success: true };
  } catch (error) {
    // Send error to content script
    await sendToTab(tx.tabId, {
      type: 'SPHERE_TRANSACTION_RESULT',
      requestId,
      success: false,
      error: (error as Error).message,
    });

    return { success: false, error: (error as Error).message };
  }
}

async function handleRejectTransaction(requestId: string): Promise<{ success: boolean; error?: string }> {
  const tx = await removePendingTransaction(requestId);

  if (!tx) {
    return { success: false, error: 'Transaction not found' };
  }

  // Send rejection to content script
  await sendToTab(tx.tabId, {
    type: 'SPHERE_TRANSACTION_RESULT',
    requestId,
    success: false,
    error: 'User rejected the request',
  });

  return { success: true };
}

// ============ Helpers ============

/**
 * Open the extension popup.
 */
async function openPopup(): Promise<void> {
  try {
    await chrome.action.openPopup();
  } catch {
    // openPopup may not be available in all contexts
    // Fall back to creating a new window
    chrome.windows.create({
      url: 'popup.html',
      type: 'popup',
      width: 380,
      height: 600,
    });
  }
}

/**
 * Send a message to a specific tab.
 */
async function sendToTab(tabId: number, message: unknown): Promise<void> {
  if (tabId === 0) {
    console.warn('Cannot send to tab 0');
    return;
  }

  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    console.error('Failed to send message to tab:', error);
  }
}
