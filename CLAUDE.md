# CLAUDE.md — Sphere Extension

Chrome extension wallet for Unicity Protocol. Branch: `rn-wallet`. Version: 0.2.0.

## Dev Commands

```bash
npm run dev        # Build + Vite watch (for development)
npm run build      # tsc --noEmit + full build
npm run build:fast # Skip type check, just build
npm run lint       # tsc --noEmit only
npm run package    # Build + create .zip for distribution
```

After build: load `dist/` folder in Chrome → chrome://extensions → Developer mode → Load unpacked.

## Architecture

```
src/
  components/           # React UI components
    ui/                # Button, BaseModal, AlertMessage, EmptyState, MenuButton, ModalHeader
    wallet/
      modals/          # SendModal, PaymentRequestsModal, TransactionHistoryModal,
                       # SettingsModal, BackupWalletModal, LogoutConfirmModal,
                       # TopUpModal, SwapModal, SeedPhraseModal, LookupModal, SaveWalletModal
      onboarding/      # CreateWalletFlow + 7 screens
      shared/          # AddressSelector, AssetRow, TokenRow, RegisterNametagModal, etc.
  platform/extension/
    background/        # Service worker (wallet-manager.ts — ALL SDK calls here)
    content/           # Content script (bridges web page ↔ background)
    inject/            # window.sphere API exposed to web pages
    popup/             # PopupApp.tsx — main entry
  sdk/                 # React adapter (context.ts, queryKeys.ts, hooks/)
  shared/              # types.ts, constants.ts, messages.ts
```

## Critical Architecture Rules

### SDK calls ONLY in background/wallet-manager.ts
The popup UI never calls SDK directly. All SDK operations go through:
```
Popup component → chrome.runtime.sendMessage({ type: 'POPUP_*' }) → wallet-manager.ts → SDK
```

### Message Types
- `POPUP_*` — Popup UI → Background service worker (30+ types)
- `SPHERE_*` — Web page → Extension (via inject → content → background)

### Chrome Storage
All wallet data in `chrome.storage.local`:
- `encryptedMnemonic` — AES-GCM encrypted (PBKDF2, 100k iterations)
- `aggregatorConfig`, `nametag`, `pendingTransactions`, `preferences`

### NO direct IndexedDB access in popup
SDK's IndexedDB (sphere-storage, sphere-token-storage-*) is managed by background service worker via wallet-manager.ts

## SDK Usage (background/wallet-manager.ts)
```typescript
import { Sphere } from '@unicitylabs/sphere-sdk'
import { createBrowserProviders } from '@unicitylabs/sphere-sdk/impl/browser'

const providers = await createBrowserProviders({ network: 'testnet' })
const { sphere } = await Sphere.init({ ...providers, l1: {} })

// Key calls:
sphere.identity                          // WalletIdentity
sphere.payments.getTokens()              // Token[]
sphere.payments.getAssets()              // Asset[]
sphere.payments.send({ recipient, amount, coinId, memo })
sphere.payments.l1.getBalance()          // L1Balance
sphere.payments.l1.send({ to, amount })
sphere.communications.sendDM(to, content)
sphere.registerNametag(name)
sphere.resolve(identifier)               // @nametag, DIRECT://, alpha1...
sphere.destroy()
```

## Key Types (src/shared/types.ts)
```typescript
interface WalletState { hasWallet: boolean; isUnlocked: boolean; activeIdentityId: string | null }
interface TokenBalance { coinId, symbol, amount, pendingAmount? }
interface PendingTransaction { requestId, type: 'send'|'sign_message'|'sign_nostr', origin, tabId, data }
interface SendTransactionData { recipient, coinId, amount, message? }
```

## Supported Tokens (src/shared/constants.ts)
UCT (18), USDU (6), EURU (6), SOL (9), BTC (8), ETH (18), ALPHT (8), USDT (6), USDC (6)

Gateway URL: `https://goggregator-test.unicity.network` (testnet)

## Path Aliases (vite.config.ts)
```
@/shared     → src/shared
@/sdk        → src/sdk
@/components → src/components
@/platform   → src/platform
```

## Build Output
- `dist/popup.html` + assets — popup UI
- `dist/background.js` — service worker
- `dist/content.js` — content script
- `dist/inject.js` — injected script (window.sphere)

## window.sphere API (exposed to web pages via inject/index.ts)
```typescript
window.sphere.isInstalled(): boolean
window.sphere.connect(): Promise<IdentityInfo>
window.sphere.getBalances(): Promise<TokenBalance[]>
window.sphere.sendTokens({ recipient, coinId, amount, message? }): Promise<{ transactionId }>
window.sphere.signMessage(message): Promise<string>
window.sphere.getNostrPublicKey(): Promise<{ hex, npub }>
window.sphere.nip44.encrypt(recipientPubkey, plaintext): Promise<string>
window.sphere.nip44.decrypt(senderPubkey, ciphertext): Promise<string>
window.sphere.getMyNametag(): Promise<{ name, proxyAddress } | null>
window.sphere.resolveNametag(nametag): Promise<NametagResolution | null>
```
