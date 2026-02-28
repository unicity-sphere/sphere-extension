# Sphere Wallet — Browser Extension

A Chrome extension wallet for the [Unicity Protocol](https://www.unicity.network/) testnet. Manage UCT tokens, register nametags, and send/receive payments.

## Install from Release

1. Go to the [Releases](../../releases) page and download the latest `sphere-wallet-v*.zip`
2. Unzip the downloaded file
3. Open Chrome and navigate to `chrome://extensions`
4. Enable **Developer mode** (toggle in the top-right corner)
5. Click **Load unpacked** and select the unzipped folder
6. The Sphere Wallet icon will appear in your toolbar

## Setup

1. Click the Sphere Wallet icon in your toolbar
2. Create a new wallet and set a password
3. **Save your recovery phrase** — this is the only way to restore your wallet
4. Go to **Settings > Network > Configure** and enter your API key
5. Register a nametag so others can send you tokens by name

## Development

```bash
# Install dependencies
npm install

# Dev build (watch mode)
npm run dev

# Production build
npm run build

# Build + zip for distribution
npm run package
```

Load the `dist/` folder as an unpacked extension in `chrome://extensions` for development.

## Features

- **Wallet management** — create, import, backup via seed phrase
- **L3 payments** — send/receive UCT and other tokens
- **L1 payments** — ALPHA blockchain transactions
- **Nametags** — register @username for human-readable addresses
- **Connect Protocol** — dApps can connect to the wallet via `ExtensionTransport` and request queries/intents
- **Connected Sites** — manage approved dApp origins (Settings → Connected Sites)
- **window.sphere API** — legacy web page integration via injected script

## Connect Protocol (for dApp developers)

Web dApps can integrate with Sphere Extension using the Sphere Connect protocol:

```typescript
import { ConnectClient } from '@unicitylabs/sphere-sdk/connect';
import { ExtensionTransport } from '@unicitylabs/sphere-sdk/connect/browser';

// Silent auto-connect on page load
const client = new ConnectClient({
  transport: ExtensionTransport.forClient(),
  dapp: { name: 'My dApp', description: '...', url: location.origin },
  silent: true,  // fast-fail if not approved — no popup
});
try {
  const { identity } = await client.connect(); // instant if already approved
} catch {
  // Not approved — show Connect button
}

// User-triggered connect (shows approval popup in extension)
const client2 = new ConnectClient({ transport: ExtensionTransport.forClient(), dapp });
const { identity, permissions } = await client2.connect();

// Queries and intents
const balance = await client2.query('sphere_getBalance');
await client2.intent('send', { recipient: '@alice', amount: 100, coinId: 'USDC' });
```

See [CONNECT.md](./CONNECT.md) for the full integration guide.

## Supported Tokens (Testnet)

| Symbol | Decimals |
|--------|----------|
| UCT    | 18       |
| USDU   | 6        |
| EURU   | 6        |
| SOL    | 9        |
| BTC    | 8        |
| ETH    | 18       |
| ALPHT  | 8        |
| USDT   | 6        |
| USDC   | 6        |
