/**
 * Receive view - show address and QR code.
 */

import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { useWallet } from '../hooks/useWallet';

export function Receive() {
  const { setView } = useStore();
  const { getAddress } = useWallet();
  const [address, setAddress] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getAddress().then(setAddress).catch(console.error);
  }, [getAddress]);

  const copyAddress = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        <h2 className="text-xl font-semibold">Receive</h2>
      </div>

      {/* Address Card */}
      <div className="bg-gray-800 rounded-xl p-6 text-center">
        {/* Placeholder for QR Code */}
        <div className="w-48 h-48 mx-auto mb-4 bg-white rounded-lg p-3">
          <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center">
            <span className="text-gray-500 text-xs">QR Code</span>
          </div>
        </div>

        <p className="text-sm text-gray-400 mb-3">
          Share this address to receive tokens
        </p>

        {/* Address */}
        <div className="bg-gray-900 rounded-lg p-3 mb-4">
          <div className="text-sm font-mono text-gray-300 break-all">
            {address || 'Loading...'}
          </div>
        </div>

        <button
          onClick={copyAddress}
          disabled={!address}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700
                     text-white font-medium py-2 px-4 rounded-lg
                     transition-colors"
        >
          {copied ? 'Copied!' : 'Copy Address'}
        </button>
      </div>
    </div>
  );
}
