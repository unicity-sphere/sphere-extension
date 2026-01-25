/**
 * NOSTR key derivation and signing utilities.
 *
 * Derives NOSTR keypairs from Alphalite identity secrets and provides
 * Schnorr signature support for NOSTR events.
 */

import { sha256 } from '@noble/hashes/sha256';
import { schnorr } from '@noble/curves/secp256k1';
import { bech32 } from '@scure/base';
import type { Identity } from '@jvsteiner/alphalite';
import { NOSTR_NPUB_PREFIX } from '@/shared/constants';

/**
 * NOSTR key pair derived from an identity.
 */
export interface NostrKeyPair {
  /** Private key (32 bytes) - keep secret! */
  privateKey: Uint8Array;
  /** Public key (32 bytes, x-only) */
  publicKey: Uint8Array;
  /** Public key as hex string */
  publicKeyHex: string;
  /** Public key in npub format (bech32) */
  npub: string;
}

/**
 * Derive a NOSTR keypair from an Alphalite identity.
 *
 * The NOSTR private key is derived by hashing the identity's secret
 * with a domain separator to ensure key isolation.
 *
 * @param identity The Alphalite identity
 * @returns NOSTR keypair
 */
export function deriveNostrKeyPair(identity: Identity): NostrKeyPair {
  // Get the identity's secret using the public getter (128 bytes from Alphalite)
  const secret = identity.getSecret();

  // Derive NOSTR private key by hashing with domain separator
  // This ensures the NOSTR key is different from other derived keys
  const domainSeparator = new TextEncoder().encode('SPHERE_NOSTR_V1');
  const combined = new Uint8Array(domainSeparator.length + secret.length);
  combined.set(domainSeparator);
  combined.set(secret, domainSeparator.length);

  const privateKey = sha256(combined);

  // Derive x-only public key (32 bytes for NOSTR/BIP340)
  const publicKey = schnorr.getPublicKey(privateKey);

  const publicKeyHex = bytesToHex(publicKey);
  const npub = encodeNpub(publicKey);

  return {
    privateKey,
    publicKey,
    publicKeyHex,
    npub,
  };
}

/**
 * Sign a NOSTR event hash using Schnorr signature (BIP340).
 *
 * @param privateKey 32-byte private key
 * @param eventHash 32-byte event hash (sha256 of serialized event)
 * @returns 64-byte Schnorr signature as hex string
 */
export function signNostrEvent(
  privateKey: Uint8Array,
  eventHash: Uint8Array
): string {
  if (eventHash.length !== 32) {
    throw new Error('Event hash must be 32 bytes');
  }

  // Sign using Schnorr (BIP340)
  const signature = schnorr.sign(eventHash, privateKey);

  return bytesToHex(signature);
}

/**
 * Sign a message and return the signature.
 *
 * For general message signing, we hash the message first then sign.
 *
 * @param privateKey 32-byte private key
 * @param message Message string to sign
 * @returns 64-byte Schnorr signature as hex string
 */
export function signMessage(
  privateKey: Uint8Array,
  message: string
): string {
  const messageBytes = new TextEncoder().encode(message);
  const messageHash = sha256(messageBytes);

  return signNostrEvent(privateKey, messageHash);
}

/**
 * Verify a Schnorr signature.
 *
 * @param publicKey 32-byte x-only public key
 * @param eventHash 32-byte event hash
 * @param signature 64-byte signature (hex string)
 * @returns true if valid
 */
export function verifyNostrSignature(
  publicKey: Uint8Array,
  eventHash: Uint8Array,
  signature: string
): boolean {
  const sigBytes = hexToBytes(signature);
  return schnorr.verify(sigBytes, eventHash, publicKey);
}

/**
 * Encode a public key as npub (bech32).
 *
 * @param publicKey 32-byte x-only public key
 * @returns npub-encoded string
 */
function encodeNpub(publicKey: Uint8Array): string {
  // Convert 8-bit bytes to 5-bit words for bech32
  const words = bech32.toWords(publicKey);
  return bech32.encode(NOSTR_NPUB_PREFIX as `${string}1${string}`, words, 1000);
}

/**
 * Decode an npub to a public key.
 *
 * @param npub npub-encoded string
 * @returns 32-byte public key
 */
export function decodeNpub(npub: string): Uint8Array {
  const { prefix, words } = bech32.decode(npub as `${string}1${string}`, 1000);
  if (prefix !== NOSTR_NPUB_PREFIX) {
    throw new Error(`Invalid npub prefix: ${prefix}`);
  }
  return bech32.fromWords(words);
}

/**
 * Convert bytes to hex string.
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hex string to bytes.
 */
function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid hex string length');
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }

  return bytes;
}
