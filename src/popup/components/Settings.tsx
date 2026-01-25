/**
 * Settings view - manage identities, export wallet, etc.
 */

import { useState } from 'react';
import { useStore } from '../store';
import { useWallet } from '../hooks/useWallet';

export function Settings() {
  const { activeIdentity, identities, setView } = useStore();
  const { lockWallet, switchIdentity, createIdentity, exportWallet, getNostrPublicKey } = useWallet();
  const [showExport, setShowExport] = useState(false);
  const [walletJson, setWalletJson] = useState('');
  const [showNewIdentity, setShowNewIdentity] = useState(false);
  const [newIdentityLabel, setNewIdentityLabel] = useState('');
  const [nostrKey, setNostrKey] = useState<{ hex: string; npub: string } | null>(null);

  const handleExport = async () => {
    const json = await exportWallet();
    setWalletJson(json);
    setShowExport(true);
  };

  const handleCreateIdentity = async () => {
    if (!newIdentityLabel.trim()) return;
    await createIdentity(newIdentityLabel);
    setNewIdentityLabel('');
    setShowNewIdentity(false);
  };

  const handleShowNostr = async () => {
    const keys = await getNostrPublicKey();
    setNostrKey(keys);
  };

  const downloadWallet = () => {
    const blob = new Blob([walletJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sphere-wallet.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setView('dashboard')}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-xl font-semibold">Settings</h2>
      </div>

      {/* Identities Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm text-gray-400">Identities</h3>
          <button
            onClick={() => setShowNewIdentity(true)}
            className="text-sm text-purple-400 hover:text-purple-300"
          >
            + Add
          </button>
        </div>

        <div className="space-y-2">
          {identities.map((identity) => (
            <button
              key={identity.id}
              onClick={() => switchIdentity(identity.id)}
              className={`w-full p-3 rounded-lg text-left flex items-center justify-between
                         transition-colors ${
                           identity.id === activeIdentity?.id
                             ? 'bg-purple-600/20 border border-purple-500'
                             : 'bg-gray-800 hover:bg-gray-700'
                         }`}
            >
              <div>
                <div className="font-medium">{identity.label}</div>
                <div className="text-xs text-gray-500 font-mono">
                  {identity.publicKey.slice(0, 16)}...
                </div>
              </div>
              {identity.id === activeIdentity?.id && (
                <span className="text-xs text-purple-400">Active</span>
              )}
            </button>
          ))}
        </div>

        {showNewIdentity && (
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={newIdentityLabel}
              onChange={(e) => setNewIdentityLabel(e.target.value)}
              placeholder="Identity name"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2
                         text-white placeholder-gray-500 text-sm
                         focus:outline-none focus:border-purple-500"
            />
            <button
              onClick={handleCreateIdentity}
              className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm"
            >
              Add
            </button>
          </div>
        )}
      </div>

      {/* NOSTR Key */}
      <div className="mb-6">
        <h3 className="text-sm text-gray-400 mb-3">NOSTR Public Key</h3>
        {nostrKey ? (
          <div className="bg-gray-800 rounded-lg p-3 space-y-2">
            <div>
              <div className="text-xs text-gray-500">npub</div>
              <div className="text-xs font-mono text-gray-300 break-all">{nostrKey.npub}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">hex</div>
              <div className="text-xs font-mono text-gray-300 break-all">{nostrKey.hex}</div>
            </div>
          </div>
        ) : (
          <button
            onClick={handleShowNostr}
            className="w-full bg-gray-800 hover:bg-gray-700 rounded-lg p-3 text-sm
                       text-gray-400 transition-colors"
          >
            Show NOSTR Public Key
          </button>
        )}
      </div>

      {/* Export Wallet */}
      <div className="mb-6">
        <h3 className="text-sm text-gray-400 mb-3">Backup</h3>
        {showExport ? (
          <div className="space-y-3">
            <textarea
              value={walletJson}
              readOnly
              rows={4}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2
                         text-gray-300 text-xs font-mono resize-none"
            />
            <button
              onClick={downloadWallet}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg
                         text-sm transition-colors"
            >
              Download File
            </button>
          </div>
        ) : (
          <button
            onClick={handleExport}
            className="w-full bg-gray-800 hover:bg-gray-700 rounded-lg p-3 text-sm
                       text-gray-400 transition-colors"
          >
            Export Wallet Backup
          </button>
        )}
      </div>

      {/* Lock Wallet */}
      <button
        onClick={lockWallet}
        className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-400
                   py-3 px-4 rounded-lg transition-colors"
      >
        Lock Wallet
      </button>
    </div>
  );
}
