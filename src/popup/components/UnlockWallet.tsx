/**
 * Unlock wallet view.
 */

import { useState } from 'react';
import { useStore } from '../store';
import { useWallet } from '../hooks/useWallet';

export function UnlockWallet() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { loading } = useStore();
  const { unlockWallet } = useWallet();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await unlockWallet(password);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-center mb-8">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500
                        flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-center mb-6">Unlock Wallet</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            required
            autoFocus
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2
                       text-white placeholder-gray-500
                       focus:outline-none focus:border-purple-500"
          />
        </div>

        {error && (
          <div className="text-red-400 text-sm text-center">{error}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700
                     text-white font-medium py-2 px-4 rounded-lg
                     transition-colors"
        >
          {loading ? 'Unlocking...' : 'Unlock'}
        </button>
      </form>
    </div>
  );
}
