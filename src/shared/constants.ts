/**
 * Constants used throughout the extension.
 */

/** Default coin ID for ALPHA token (hex-encoded 'ALPHA') */
export const ALPHA_COIN_ID = '414c504841';

/** Known coin symbols by ID */
export const COIN_SYMBOLS: Record<string, string> = {
  '414c504841': 'ALPHA',
};

/** Default auto-lock timeout in minutes */
export const DEFAULT_AUTO_LOCK_TIMEOUT = 15;

/** Extension name for display */
export const EXTENSION_NAME = 'Sphere Wallet';

/** Default token type (32 bytes of 0x01) */
export const DEFAULT_TOKEN_TYPE = new Uint8Array(32).fill(0x01);

/** Gateway URL for Unicity Protocol (test network) */
export const GATEWAY_URL = 'https://goggregator-test.unicity.network';

/** NOSTR event kinds we support signing */
export const SUPPORTED_NOSTR_KINDS = [0, 1, 3, 4, 5, 6, 7];

/** Bech32 prefix for NOSTR public keys */
export const NOSTR_NPUB_PREFIX = 'npub';

/** NOSTR relay URL for nametag operations */
export const NOSTR_RELAY_URL = 'wss://nostr-relay.testnet.unicity.network';

/** Default NOSTR relays */
export const DEFAULT_NOSTR_RELAYS = [NOSTR_RELAY_URL];

/** Unicity token type (used for nametag tokens) */
export const UNICITY_TOKEN_TYPE_HEX =
  'f8aa13834268d29355ff12183066f0cb902003629bbc5eb9ef0efbe397867509';
