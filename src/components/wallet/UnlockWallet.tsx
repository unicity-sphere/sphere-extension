import { useState } from 'react';
import { Loader2, Lock, AlertCircle } from 'lucide-react';
import { getErrorMessage } from '@/sdk/errors';

interface UnlockWalletProps {
  onUnlock: (password: string) => Promise<void>;
}

export function UnlockWallet({ onUnlock }: UnlockWalletProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || isLoading) return;

    setError('');
    setIsLoading(true);

    try {
      await onUnlock(password);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-transparent h-full relative overflow-hidden no-text-shadow">

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-6">
        {/* Lock Icon */}
        <div className="relative">
          <div className="absolute inset-0 rounded-2xl blur-lg opacity-50 bg-brand-orange" />
          <div className="relative w-16 h-16 rounded-2xl bg-linear-to-br from-brand-orange to-brand-orange-dark flex items-center justify-center shadow-xl shadow-brand-orange/25">
            <Lock className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold text-white">Unlock Wallet</h2>
          <p className="text-sm text-[#ffe2cc]">
            Enter your password to continue
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div className="relative">
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              placeholder="Password"
              required
              autoFocus
              disabled={isLoading}
              className="w-full px-4 py-3 text-sm bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-orange/50 focus:border-brand-orange disabled:opacity-50 transition-colors"
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-900/20 border border-red-800/50">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !password.trim()}
            className="w-full py-3 px-4 bg-linear-to-r from-brand-orange to-brand-orange-dark text-white text-sm font-mono font-medium rounded-xl shadow-lg shadow-brand-orange/25 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] transition-transform"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Unlocking...
              </span>
            ) : (
              'Unlock'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
