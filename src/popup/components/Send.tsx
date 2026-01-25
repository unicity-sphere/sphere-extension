/**
 * Send view - send tokens to a recipient.
 */

import { useState } from 'react';
import { useStore } from '../store';
import { ALPHA_COIN_ID } from '@/shared/constants';

export function Send() {
  const { balances, setView } = useStore();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');

  const alphaBalance = balances.find((b) => b.coinId === ALPHA_COIN_ID);
  const maxAmount = alphaBalance?.amount || '0';

  const formatBalance = (amt: string): string => {
    const num = parseFloat(amt);
    return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
  };

  const handleSetMax = () => {
    setAmount(maxAmount);
  };

  const isValidAmount = () => {
    const num = parseFloat(amount);
    const max = parseFloat(maxAmount);
    return !isNaN(num) && num > 0 && num <= max;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement send - this will need to go through the background
    // For now, show a message that this would send
    alert(`Would send ${amount} ALPHA to ${recipient}\n\nNote: Direct sending from popup is not yet implemented. Use a connected website to send tokens.`);
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
        <h2 className="text-xl font-semibold">Send</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Recipient */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Recipient Address
          </label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Enter address or public key"
            required
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2
                       text-white placeholder-gray-500 font-mono text-sm
                       focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Amount */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm text-gray-400">Amount</label>
            <span className="text-xs text-gray-500">
              Balance: {formatBalance(maxAmount)} ALPHA
            </span>
          </div>
          <div className="relative">
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 pr-16
                         text-white placeholder-gray-500
                         focus:outline-none focus:border-purple-500"
            />
            <button
              type="button"
              onClick={handleSetMax}
              className="absolute right-2 top-1/2 -translate-y-1/2
                         text-xs text-purple-400 hover:text-purple-300
                         bg-gray-700 px-2 py-1 rounded"
            >
              MAX
            </button>
          </div>
        </div>

        {/* Token Selector (just ALPHA for now) */}
        <div className="bg-gray-800 rounded-lg p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-purple-500/20
                          flex items-center justify-center">
            <span className="text-xs font-medium text-purple-400">AL</span>
          </div>
          <div className="flex-1">
            <div className="font-medium">ALPHA</div>
            <div className="text-xs text-gray-500">Unicity Protocol</div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!recipient || !isValidAmount()}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700
                     text-white font-medium py-3 px-4 rounded-lg
                     transition-colors"
        >
          Continue
        </button>
      </form>

      <p className="mt-4 text-xs text-gray-500 text-center">
        Sending requires approval. You'll review the transaction before confirming.
      </p>
    </div>
  );
}
