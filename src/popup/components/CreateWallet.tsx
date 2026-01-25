/**
 * Create wallet view - initial setup flow.
 */

import { useState } from 'react';
import { useStore } from '../store';
import { useWallet } from '../hooks/useWallet';

export function CreateWallet() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [walletName, setWalletName] = useState('');
  const [error, setError] = useState('');
  const { loading, setView } = useStore();
  const { createWallet } = useWallet();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      await createWallet(password, walletName || undefined);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-6">Create New Wallet</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Wallet Name (optional)
          </label>
          <input
            type="text"
            value={walletName}
            onChange={(e) => setWalletName(e.target.value)}
            placeholder="My Sphere Wallet"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2
                       text-white placeholder-gray-500
                       focus:outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password (min 8 characters)"
            required
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2
                       text-white placeholder-gray-500
                       focus:outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Confirm Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm password"
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
          {loading ? 'Creating...' : 'Create Wallet'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-gray-400 text-sm">
          Already have a wallet?{' '}
          <button
            onClick={() => setView('import-wallet')}
            className="text-purple-400 hover:text-purple-300"
          >
            Import from backup
          </button>
        </p>
      </div>
    </div>
  );
}
