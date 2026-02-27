/**
 * ConnectHost manager for the extension background service worker.
 *
 * Bridges the Sphere Connect protocol to the extension's existing wallet infrastructure:
 * - Creates a ConnectHost backed by ExtensionTransport when the wallet is unlocked
 * - Routes onConnectionRequest → extension popup (ConnectApprovalModal)
 * - Routes onIntent → extension popup (existing SendPanel / SignMessagePanel etc.)
 * - Exposes pending approval/intent queues that the popup polls via POPUP_* messages
 */

import { ConnectHost } from '@unicitylabs/sphere-sdk/connect';
import { ExtensionTransport } from '@unicitylabs/sphere-sdk/connect/browser';
import type { DAppMetadata, ConnectSession } from '@unicitylabs/sphere-sdk/connect';
import type { PermissionScope } from '@unicitylabs/sphere-sdk/connect';
import { walletManager } from './wallet-manager';

// =============================================================================
// Pending approval / intent types (shared with popup via POPUP_* messages)
// =============================================================================

export interface PendingConnectApproval {
  id: string;
  dapp: DAppMetadata;
  requestedPermissions: PermissionScope[];
  resolve: (result: { approved: boolean; grantedPermissions: PermissionScope[] }) => void;
}

export interface PendingConnectIntent {
  id: string;
  action: string;
  params: Record<string, unknown>;
  session: ConnectSession;
  resolve: (result: { result?: unknown; error?: { code: number; message: string } }) => void;
}

// =============================================================================
// State
// =============================================================================

/** Pending dApp connection approval waiting for user decision in popup. */
let pendingApproval: PendingConnectApproval | null = null;

/** Pending intent waiting for user action in popup. */
let pendingIntent: PendingConnectIntent | null = null;

/** Active ConnectHost instance. Recreated each time wallet is unlocked. */
let connectHost: ConnectHost | null = null;

// =============================================================================
// Popup helpers
// =============================================================================

export function isConnectHostActive(): boolean {
  return connectHost !== null;
}

export async function openPopupForConnect(): Promise<void> {
  try {
    await chrome.action.openPopup();
  } catch {
    try {
      await chrome.windows.create({ url: 'popup.html', type: 'popup', width: 380, height: 600 });
    } catch {
      // Ignore — popup may already be open
    }
  }
}

// =============================================================================
// ConnectHost lifecycle
// =============================================================================

/**
 * Initialize (or reinitialize) ConnectHost with the current sphere instance.
 * Called after wallet unlock. Destroys any previous host first.
 */
export function initConnectHost(): void {
  destroyConnectHost();

  const sphere = walletManager.getSphereInstance();
  if (!sphere) return;

  const transport = ExtensionTransport.forHost({ onMessage: chrome.runtime.onMessage, tabs: chrome.tabs });

  connectHost = new ConnectHost({
    sphere,
    transport,

    onConnectionRequest: async (dapp, requestedPermissions) => {
      // Open popup to show ConnectApprovalModal
      await openPopupForConnect();

      return new Promise<{ approved: boolean; grantedPermissions: PermissionScope[] }>((resolve) => {
        pendingApproval = {
          id: crypto.randomUUID(),
          dapp,
          requestedPermissions,
          resolve,
        };

        // Timeout: reject after 2 minutes if user doesn't respond
        setTimeout(() => {
          if (pendingApproval) {
            pendingApproval.resolve({ approved: false, grantedPermissions: [] });
            pendingApproval = null;
          }
        }, 120_000);
      });
    },

    onIntent: async (action, params, session) => {
      // Open popup to show intent UI (SendPanel, SignMessagePanel, etc.)
      await openPopupForConnect();

      return new Promise<{ result?: unknown; error?: { code: number; message: string } }>((resolve) => {
        pendingIntent = {
          id: crypto.randomUUID(),
          action,
          params,
          session,
          resolve,
        };

        // Timeout: reject after 5 minutes if user doesn't respond
        setTimeout(() => {
          if (pendingIntent) {
            pendingIntent.resolve({ error: { code: 4001, message: 'User rejected' } });
            pendingIntent = null;
          }
        }, 300_000);
      });
    },
  });
}

/** Destroy the active ConnectHost and clear pending queues. */
export function destroyConnectHost(): void {
  if (connectHost) {
    connectHost.destroy();
    connectHost = null;
  }
  if (pendingApproval) {
    pendingApproval.resolve({ approved: false, grantedPermissions: [] });
    pendingApproval = null;
  }
  if (pendingIntent) {
    pendingIntent.resolve({ error: { code: 4001, message: 'User rejected' } });
    pendingIntent = null;
  }
}

// =============================================================================
// Popup message handlers (called from message-handler.ts POPUP_* routing)
// =============================================================================

/** Popup polls this to render ConnectApprovalModal. */
export function getConnectApproval(): Omit<PendingConnectApproval, 'resolve'> | null {
  if (!pendingApproval) return null;
  const { id, dapp, requestedPermissions } = pendingApproval;
  return { id, dapp, requestedPermissions };
}

/** Popup calls this when user approves/rejects the dApp connection. */
export function resolveConnectApproval(
  id: string,
  approved: boolean,
  grantedPermissions: PermissionScope[],
): boolean {
  if (!pendingApproval || pendingApproval.id !== id) return false;
  pendingApproval.resolve({ approved, grantedPermissions });
  pendingApproval = null;
  return true;
}

/** Popup polls this to render intent UI. */
export function getConnectIntent(): Omit<PendingConnectIntent, 'resolve'> | null {
  if (!pendingIntent) return null;
  const { id, action, params, session } = pendingIntent;
  return { id, action, params, session };
}

/** Popup calls this with the intent result. */
export function resolveConnectIntent(
  id: string,
  result: { result?: unknown; error?: { code: number; message: string } },
): boolean {
  if (!pendingIntent || pendingIntent.id !== id) return false;
  pendingIntent.resolve(result);
  pendingIntent = null;
  return true;
}
