/**
 * Import wallet view - restore from backup.
 */

import { useState } from 'react';
import { useStore } from '../store';
import { useWallet } from '../hooks/useWallet';

export function ImportWallet() {
  const [walletJson, setWalletJson] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { loading, setView } = useStore();
  const { importWallet } = useWallet();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setWalletJson(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!walletJson.trim()) {
      setError('Please paste wallet JSON or upload a file');
      return;
    }

    if (!password) {
      setError('Password is required');
      return;
    }

    try {
      await importWallet(walletJson, password);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-6">Import Wallet</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Upload wallet file
          </label>
          <input
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="w-full text-gray-400 text-sm
                       file:mr-4 file:py-2 file:px-4
                       file:rounded-lg file:border-0
                       file:bg-gray-700 file:text-white
                       hover:file:bg-gray-600"
          />
        </div>

        <div className="text-center text-gray-500 text-sm">or</div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Paste wallet JSON
          </label>
          <textarea
            value={walletJson}
            onChange={(e) => setWalletJson(e.target.value)}
            placeholder='{"version": "1.0", ...}'
            rows={5}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2
                       text-white placeholder-gray-500 text-sm font-mono
                       focus:outline-none focus:border-purple-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Wallet Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter wallet password"
            required
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2
                       text-white placeholder-gray-500
                       focus:outline-none focus:border-purple-500"
          />
        </div>

        {error && (
          <div className="text-red-400 text-sm">{error}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700
                     text-white font-medium py-2 px-4 rounded-lg
                     transition-colors"
        >
          {loading ? 'Importing...' : 'Import Wallet'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={() => setView('create-wallet')}
          className="text-gray-400 hover:text-gray-300 text-sm"
        >
          ← Back to create wallet
        </button>
      </div>
    </div>
  );
}
