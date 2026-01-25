/**
 * NostrService - NOSTR relay client for nametag operations.
 *
 * Wraps @unicitylabs/nostr-js-sdk for:
 * - Connection management
 * - Nametag resolution (pubkey lookup)
 * - Nametag binding publication
 * - Token transfer messaging (P2P)
 */

import {
  NostrClient,
  NostrKeyManager,
  EventKinds,
  Filter,
  TokenTransferProtocol,
  type Event,
} from '@unicitylabs/nostr-js-sdk';
import { DEFAULT_NOSTR_RELAYS } from '@/shared/constants';

// ============ Types ============

export interface NostrConfig {
  relays?: string[];
  debug?: boolean;
}

export interface ReceivedTokenTransfer {
  eventId: string;
  senderPubkey: string;
  sourceToken: unknown;
  transferTx: unknown;
  timestamp: number;
}

export type TokenTransferHandler = (transfer: ReceivedTokenTransfer) => Promise<boolean>;

// Storage keys for sync state
const STORAGE_KEYS = {
  LAST_SYNC: 'nostr_last_sync',
  PROCESSED_EVENTS: 'nostr_processed_events',
};

const MAX_PROCESSED_EVENTS = 100;

// ============ NostrService ============

/**
 * NOSTR service for nametag and token transfer operations.
 */
export class NostrService {
  private client: NostrClient | null = null;
  private keyManager: NostrKeyManager | null = null;
  private config: NostrConfig;

  private isConnected = false;
  private isConnecting = false;
  private connectPromise: Promise<void> | null = null;

  private tokenTransferHandler: TokenTransferHandler | null = null;
  private processedEventIds = new Set<string>();

  constructor(config: NostrConfig = {}) {
    this.config = config;
  }

  // ============ Connection Management ============

  /**
   * Connect to NOSTR relays with the given private key.
   *
   * @param privateKeyHex 32-byte private key as hex string
   */
  async connect(privateKeyHex: string): Promise<void> {
    if (this.isConnected) return;

    if (this.isConnecting && this.connectPromise) {
      return this.connectPromise;
    }

    this.isConnecting = true;
    this.connectPromise = this.doConnect(privateKeyHex);

    try {
      await this.connectPromise;
    } finally {
      this.isConnecting = false;
      this.connectPromise = null;
    }
  }

  private async doConnect(privateKeyHex: string): Promise<void> {
    const secretKey = this.hexToBytes(privateKeyHex);
    this.keyManager = NostrKeyManager.fromPrivateKey(secretKey);
    this.client = new NostrClient(this.keyManager);

    const relays = this.config.relays ?? DEFAULT_NOSTR_RELAYS;

    this.log('Connecting to NOSTR relays...');
    try {
      await this.client.connect(...relays);
      this.isConnected = true;
      this.log('Connected to NOSTR relays');

      // Load processed events from storage
      await this.loadProcessedEvents();

      // Subscribe to incoming token transfers
      this.subscribeToEvents(this.keyManager.getPublicKeyHex());
    } catch (error) {
      this.logError('Failed to connect to NOSTR', error);
      throw error;
    }
  }

  /**
   * Disconnect from NOSTR relays.
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.disconnect();
      } catch (err) {
        this.logWarn('Error disconnecting', err);
      }
      this.client = null;
    }

    this.keyManager = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.connectPromise = null;
    this.log('Disconnected from NOSTR');
  }

  /**
   * Check if connected to NOSTR relays.
   */
  getIsConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get the current NOSTR public key.
   */
  getPublicKey(): string | null {
    return this.keyManager?.getPublicKeyHex() ?? null;
  }

  // ============ Nametag Operations ============

  /**
   * Query the NOSTR pubkey associated with a nametag.
   *
   * @param nametag Nametag to look up (without @)
   * @returns Public key hex if found, null otherwise
   */
  async queryPubkeyByNametag(nametag: string): Promise<string | null> {
    await this.ensureConnected();

    try {
      const cleanTag = this.cleanNametag(nametag);
      const pubkey = await this.client?.queryPubkeyByNametag(cleanTag);
      return pubkey ?? null;
    } catch (error) {
      this.logError('Failed to query nametag', error);
      return null;
    }
  }

  /**
   * Publish a nametag binding to NOSTR relays.
   *
   * @param nametag Nametag to bind (without @)
   * @param unicityAddress Proxy address for the nametag
   * @returns true if successful
   */
  async publishNametagBinding(nametag: string, unicityAddress: string): Promise<boolean> {
    await this.ensureConnected();

    try {
      await this.client?.publishNametagBinding(nametag, unicityAddress);
      this.log(`Published nametag binding: ${nametag} -> ${unicityAddress}`);
      return true;
    } catch (error) {
      this.logError('Failed to publish nametag binding', error);
      return false;
    }
  }

  // ============ Token Transfer Operations ============

  /**
   * Send a token transfer notification via NOSTR.
   *
   * @param recipientPubkey Recipient's NOSTR public key (hex)
   * @param payloadJson JSON payload containing sourceToken and transferTx
   * @param options Optional display info (amount, symbol)
   * @returns true if successful
   */
  async sendTokenTransfer(
    recipientPubkey: string,
    payloadJson: string,
    options?: { amount?: bigint; symbol?: string }
  ): Promise<boolean> {
    await this.ensureConnected();

    try {
      await this.client?.sendTokenTransfer(recipientPubkey, payloadJson, {
        amount: options?.amount,
        symbol: options?.symbol,
      });
      this.log(`Sent token transfer to ${recipientPubkey.slice(0, 8)}...`);
      return true;
    } catch (error) {
      this.logError('Failed to send token transfer', error);
      return false;
    }
  }

  /**
   * Set handler for incoming token transfers.
   *
   * @param handler Callback function to process incoming transfers
   */
  onTokenTransfer(handler: TokenTransferHandler): void {
    this.tokenTransferHandler = handler;
  }

  // ============ Event Subscription ============

  private subscribeToEvents(publicKey: string): void {
    if (!this.client) return;

    const lastSync = this.getLastSyncSync();

    // Subscribe to token transfers sent to us
    const walletFilter = new Filter();
    walletFilter.kinds = [EventKinds.TOKEN_TRANSFER];
    walletFilter['#p'] = [publicKey];
    walletFilter.since = lastSync;

    this.client.subscribe(walletFilter, {
      onEvent: (event) => this.handleEvent(event),
      onEndOfStoredEvents: () => {
        this.log('End of stored wallet events');
      },
    });
  }

  private async handleEvent(event: Event): Promise<void> {
    // Skip if already processed
    if (this.processedEventIds.has(event.id)) {
      return;
    }

    // Skip old events
    const lastSync = this.getLastSyncSync();
    if (event.created_at < lastSync) {
      return;
    }

    this.log(`Processing event kind=${event.kind}`);

    let success = false;

    if (event.kind === EventKinds.TOKEN_TRANSFER) {
      success = await this.handleTokenTransfer(event);
    }

    if (success) {
      await this.markEventProcessed(event.id);
      await this.updateLastSync(event.created_at);
    }
  }

  private async handleTokenTransfer(event: Event): Promise<boolean> {
    if (!this.tokenTransferHandler || !this.keyManager) {
      return false;
    }

    try {
      const tokenJson = await TokenTransferProtocol.parseTokenTransfer(event, this.keyManager);

      // Parse JSON payload
      let payload: { sourceToken?: unknown; transferTx?: unknown };
      try {
        payload = JSON.parse(tokenJson);
      } catch {
        this.logWarn('Failed to parse token transfer JSON');
        return false;
      }

      if (!payload.sourceToken || !payload.transferTx) {
        this.logWarn('Invalid token transfer payload');
        return false;
      }

      const transfer: ReceivedTokenTransfer = {
        eventId: event.id,
        senderPubkey: event.pubkey,
        sourceToken: payload.sourceToken,
        transferTx: payload.transferTx,
        timestamp: event.created_at * 1000,
      };

      return await this.tokenTransferHandler(transfer);
    } catch (error) {
      this.logError('Failed to handle token transfer', error);
      return false;
    }
  }

  // ============ Storage / Sync State ============

  private async loadProcessedEvents(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.PROCESSED_EVENTS);
      const saved = result[STORAGE_KEYS.PROCESSED_EVENTS];
      if (saved) {
        const ids = JSON.parse(saved) as string[];
        this.processedEventIds = new Set(ids);
        this.log(`Loaded ${ids.length} processed event IDs`);
      }
    } catch (error) {
      this.logError('Failed to load processed events', error);
      this.processedEventIds = new Set();
    }
  }

  private async saveProcessedEvents(): Promise<void> {
    try {
      let ids = Array.from(this.processedEventIds);
      if (ids.length > MAX_PROCESSED_EVENTS) {
        ids = ids.slice(-MAX_PROCESSED_EVENTS);
        this.processedEventIds = new Set(ids);
      }
      await chrome.storage.local.set({
        [STORAGE_KEYS.PROCESSED_EVENTS]: JSON.stringify(ids),
      });
    } catch (error) {
      this.logError('Failed to save processed events', error);
    }
  }

  private async markEventProcessed(eventId: string): Promise<void> {
    this.processedEventIds.add(eventId);
    if (this.processedEventIds.size > MAX_PROCESSED_EVENTS) {
      const first = this.processedEventIds.values().next().value;
      if (first) this.processedEventIds.delete(first);
    }
    await this.saveProcessedEvents();
  }

  private getLastSyncSync(): number {
    // Synchronous fallback - 5 minutes ago
    return Math.floor(Date.now() / 1000) - 300;
  }

  private async getLastSync(): Promise<number> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.LAST_SYNC);
      const saved = result[STORAGE_KEYS.LAST_SYNC];
      if (saved) {
        return parseInt(saved, 10);
      }
    } catch {
      // Ignore
    }
    const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 300;
    await chrome.storage.local.set({ [STORAGE_KEYS.LAST_SYNC]: fiveMinutesAgo.toString() });
    return fiveMinutesAgo;
  }

  private async updateLastSync(timestamp: number): Promise<void> {
    const current = await this.getLastSync();
    if (timestamp > current) {
      await chrome.storage.local.set({ [STORAGE_KEYS.LAST_SYNC]: timestamp.toString() });
    }
  }

  // ============ Helpers ============

  private async ensureConnected(): Promise<void> {
    if (!this.isConnected) {
      throw new Error('NOSTR service not connected');
    }
  }

  private cleanNametag(nametag: string): string {
    return nametag.replace('@unicity', '').replace('@', '').trim();
  }

  private hexToBytes(hex: string): Uint8Array {
    if (hex.length % 2 !== 0) {
      throw new Error('Invalid hex string length');
    }
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }

  private log(message: string): void {
    if (this.config.debug) {
      console.log(`[NostrService] ${message}`);
    }
  }

  private logWarn(message: string, error?: unknown): void {
    if (this.config.debug) {
      console.warn(`[NostrService] ${message}`, error ?? '');
    }
  }

  private logError(message: string, error?: unknown): void {
    console.error(`[NostrService] ${message}`, error ?? '');
  }
}

// Singleton instance
export const nostrService = new NostrService({ debug: true });
