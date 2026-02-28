# Sphere Extension — Connect Protocol Integration Guide

This document explains how the Sphere browser extension implements the Sphere Connect protocol, allowing web dApps to interact with the wallet via `ExtensionTransport`.

## Overview

```
dApp page (any website)
    │  window.postMessage (sphere-connect-ext:tohost)
    ↓
Content Script (injected on every page)
    │  chrome.runtime.sendMessage
    ↓
Background Service Worker
    │  ExtensionTransport.forHost
    ↓
ConnectHost → Sphere SDK instance
```

## Key Files

| File | Role |
|------|------|
| `src/platform/extension/background/connect-host.ts` | ConnectHost lifecycle, approved origins, approval/intent queues |
| `src/platform/extension/background/message-handler.ts` | Routes POPUP_* messages from extension popup to connect-host |
| `src/platform/extension/background/wallet-manager.ts` | Holds the Sphere SDK instance; calls `initConnectHost()` after unlock |
| `src/platform/extension/content/index.ts` | Relays sphere-connect-ext messages between page and background |
| `src/components/wallet/modals/ConnectApprovalModal.tsx` | UI shown to user for first-time dApp connection |
| `src/components/wallet/modals/ConnectedSitesModal.tsx` | Settings → Connected Sites — lists approved origins, allows revoke |
| `src/components/wallet/modals/SettingsModal.tsx` | Settings entry point (includes Connected Sites menu item) |

---

## Approved Origins (Persistent Permissions)

Approved origins are stored in `chrome.storage.local` under key `sphere_approved_origins`:

```typescript
interface ApprovedOriginEntry {
  permissions: PermissionScope[];
  connectedAt: number;   // timestamp of first approval
  lastSeenAt: number;    // timestamp of last successful connect
  dapp: DAppMetadata;
}

// Storage shape:
{
  "sphere_approved_origins": {
    "https://app.example.com": { permissions: [...], connectedAt: 1234, lastSeenAt: 1234, dapp: {...} },
    "http://localhost:5174":   { permissions: [...], connectedAt: 1234, lastSeenAt: 1234, dapp: {...} }
  }
}
```

### Flow on connection request

```
dApp calls client.connect()
    │
    ↓ handshake arrives at ConnectHost
    │
    ├─ silent=true (auto-connect check)?
    │      ├─ origin in storage? → approve silently (update lastSeenAt)
    │      └─ origin NOT in storage? → reject immediately (no popup)
    │
    └─ silent=false (user clicked "Connect")?
           ├─ origin in storage? → approve silently
           └─ origin NOT in storage? → open extension popup → show ConnectApprovalModal
                    │
                    ├─ User approves → save origin to storage → return approved
                    └─ User rejects (or 2-min timeout) → return rejected
```

### Managing approved origins

```typescript
import {
  getConnectedSites,
  revokeConnectedSite,
} from '@/platform/extension/background/connect-host';

// Get all approved origins (used by Connected Sites UI)
const sites = await getConnectedSites();
// { "https://example.com": { permissions, connectedAt, lastSeenAt, dapp } }

// Revoke an origin (used by Connected Sites UI revoke button)
await revokeConnectedSite('https://example.com');
```

When `revokeConnectedSite` is called, the origin is removed from `chrome.storage.local`. The next time the dApp loads and does a silent-check, it will fail and show the Connect button instead of auto-connecting.

---

## onDisconnect — dApp-initiated disconnect

When a dApp calls `client.disconnect()`, the SDK sends `sphere_disconnect` RPC. `ConnectHost` handles it by:
1. Revoking the in-memory session
2. Calling `onDisconnect(session)` — the extension uses this to `revokeConnectedSite(origin)`

This means: **disconnect from the dApp side = revoke approval from the wallet**. The dApp must re-request approval on next connect.

---

## ConnectHost Lifecycle

`ConnectHost` is created after wallet unlock and destroyed on lock:

```typescript
// In wallet-manager.ts after unlock:
initConnectHost();

// In wallet-manager.ts on lock:
destroyConnectHost();
```

`destroyConnectHost()` also rejects any pending approval or intent with a user-rejected error.

---

## Pending Approvals & Intents

The background keeps at most **one** pending approval and **one** pending intent at a time.

The extension popup polls via `chrome.runtime.sendMessage`:

```typescript
// Poll for pending approval
chrome.runtime.sendMessage({ type: 'POPUP_GET_CONNECT_APPROVAL' })
// → null  (no pending) or { id, dapp, requestedPermissions }

// Resolve approval (user clicked Connect or Reject)
chrome.runtime.sendMessage({
  type: 'POPUP_RESOLVE_CONNECT_APPROVAL',
  id,
  approved: true,
  grantedPermissions: [...],
})

// Poll for pending intent
chrome.runtime.sendMessage({ type: 'POPUP_GET_CONNECT_INTENT' })
// → null  (no pending) or { id, action, params, session }

// Resolve intent
chrome.runtime.sendMessage({
  type: 'POPUP_RESOLVE_CONNECT_INTENT',
  id,
  result: { result: { ... } },          // success
  // or:
  result: { error: { code: 4001, message: 'User rejected' } },
})

// Get all connected sites
chrome.runtime.sendMessage({ type: 'POPUP_GET_CONNECTED_SITES' })
// → { success: true, sites: Record<string, ApprovedOriginEntry> }

// Revoke a site from settings
chrome.runtime.sendMessage({ type: 'POPUP_REVOKE_CONNECTED_SITE', origin: 'https://...' })
// → { success: true }
```

Timeouts:
- Approval: **2 minutes** (auto-rejected if user doesn't respond)
- Intent: **5 minutes** (auto-rejected)

---

## Intent Routing

When a dApp sends an intent, `onIntent` in `connect-host.ts` opens the popup and stores `pendingIntent`. The popup's `WalletPanel.tsx` polls for it and routes to the correct UI:

| Intent action | UI component |
|--------------|--------------|
| `send` | `SendModal` (pre-filled with recipient/amount/coinId) |
| other | `ConnectIntentModal` (generic approval) |

---

## Content Script Relay

The content script (`content/index.ts`) bridges the page and the background for the Connect protocol:

```
Page: window.postMessage({ type: 'sphere-connect-ext:tohost', ... })
    → content script: chrome.runtime.sendMessage(envelope)
    → background: ConnectHost handles it

Background: chrome.tabs.sendMessage(tabId, { type: 'sphere-connect-ext:toclient', ... })
    → content script: window.postMessage(message, '*')
    → page: ExtensionTransport.forClient() receives it
```

---

## Adding a New Intent UI

1. Add the intent action to `INTENT_ACTIONS` in `sphere-sdk/connect/protocol.ts`
2. Add the intent permission to `permissions.ts`
3. In `WalletPanel.tsx`, add a case in the intent routing switch
4. Create (or reuse) a modal component for the UI
5. Resolve via `chrome.runtime.sendMessage({ type: 'POPUP_RESOLVE_CONNECT_INTENT', id, result })`
