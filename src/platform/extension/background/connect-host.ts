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
// Persistent approved origins stored in chrome.storage.local
// =============================================================================

const APPROVED_ORIGINS_KEY = 'sphere_approved_origins';

export interface ApprovedOriginEntry {
  permissions: PermissionScope[];
  connectedAt: number;
  lastSeenAt: number;
  dapp: DAppMetadata;
}

async function getApprovedOrigins(): Promise<Record<string, ApprovedOriginEntry>> {
  const result = await chrome.storage.local.get(APPROVED_ORIGINS_KEY);
  return (result[APPROVED_ORIGINS_KEY] as Record<string, ApprovedOriginEntry>) ?? {};
}

async function saveApprovedOrigin(
  origin: string,
  dapp: DAppMetadata,
  permissions: PermissionScope[],
): Promise<void> {
  const current = await getApprovedOrigins();
  current[origin] = { permissions, connectedAt: Date.now(), lastSeenAt: Date.now(), dapp };
  await chrome.storage.local.set({ [APPROVED_ORIGINS_KEY]: current });
}

/** Returns all approved sites (for settings UI). */
export async function getConnectedSites(): Promise<Record<string, ApprovedOriginEntry>> {
  return getApprovedOrigins();
}

/** Revoke a previously approved site (from settings UI). */
export async function revokeConnectedSite(origin: string): Promise<void> {
  const current = await getApprovedOrigins();
  delete current[origin];
  await chrome.storage.local.set({ [APPROVED_ORIGINS_KEY]: current });
}

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

    onConnectionRequest: async (dapp, requestedPermissions, silent) => {
      // If this origin was previously approved, restore silently without any UI.
      try {
        const origin = new URL(dapp.url).origin;
        const approved = await getApprovedOrigins();
        if (approved[origin]) {
          // Update lastSeenAt so UI shows recent activity
          approved[origin].lastSeenAt = Date.now();
          await chrome.storage.local.set({ [APPROVED_ORIGINS_KEY]: approved });
          return { approved: true, grantedPermissions: approved[origin].permissions };
        }
      } catch {
        // Invalid URL — fall through
      }

      // Silent mode (auto-connect on page load): reject immediately without opening any UI.
      // This prevents popup windows from appearing when the origin is no longer approved.
      if (silent) {
        return { approved: false, grantedPermissions: [] };
      }

      // First-time connection — open popup to show ConnectApprovalModal
      await openPopupForConnect();

      return new Promise<{ approved: boolean; grantedPermissions: PermissionScope[] }>((resolve) => {
        pendingApproval = {
          id: crypto.randomUUID(),
          dapp,
          requestedPermissions,
          resolve: (result) => {
            // Persist approval so subsequent connects skip the popup
            if (result.approved) {
              try {
                const origin = new URL(dapp.url).origin;
                saveApprovedOrigin(origin, dapp, result.grantedPermissions).catch(console.error);
              } catch {
                // ignore
              }
            }
            resolve(result);
          },
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

    onDisconnect: async (session) => {
      // dApp explicitly disconnected — remove from approved origins
      try {
        const origin = new URL(session.dapp.url).origin;
        await revokeConnectedSite(origin);
      } catch {
        // ignore
      }
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
