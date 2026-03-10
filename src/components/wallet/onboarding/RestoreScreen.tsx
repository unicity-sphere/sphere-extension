/**
 * RestoreScreen - Mnemonic recovery phrase input screen
 * Ported from sphere web app — no password fields (password is a separate step)
 */
import { KeyRound, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

interface RestoreScreenProps {
  seedWords: string[];
  isBusy: boolean;
  error: string | null;
  onSeedWordsChange: (words: string[]) => void;
  onRestore: () => void;
  onBack: () => void;
}

export function RestoreScreen({
  seedWords,
  isBusy,
  error,
  onSeedWordsChange,
  onRestore,
  onBack,
}: RestoreScreenProps) {
  const handleWordChange = (index: number, value: string) => {
    const newWords = [...seedWords];
    newWords[index] = value;
    onSeedWordsChange(newWords);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData("text").trim();
    const words = pastedText.split(/\s+/).filter((w) => w.length > 0);
    if (words.length > 1) {
      e.preventDefault();
      const newWords = Array(12).fill("");
      words.slice(0, 12).forEach((word, i) => {
        newWords[i] = word.toLowerCase();
      });
      onSeedWordsChange(newWords);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter" && index < 11) {
      const nextInput = (e.currentTarget as HTMLElement).parentElement
        ?.nextElementSibling?.querySelector("input");
      nextInput?.focus();
    } else if (e.key === "Enter" && index === 11 && isComplete) {
      onRestore();
    }
  };

  const isComplete = seedWords.every((w) => w.trim());

  return (
    <div className="relative z-10 w-full max-w-95">
      {/* Icon */}
      <div className="relative w-18 h-18 mx-auto mb-6">
        <div className="absolute inset-0 bg-brand-orange/30 rounded-2xl blur-xl" />
        <div className="relative w-full h-full rounded-2xl bg-linear-to-br from-brand-orange to-brand-orange-dark flex items-center justify-center shadow-xl shadow-brand-orange/25">
          <KeyRound className="w-9 h-9 text-white" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
        Restore Wallet
      </h2>
      <p className="text-[#ffe2cc] text-sm mb-6 mx-auto leading-relaxed">
        Enter your 12-word recovery phrase to restore your wallet
      </p>

      {/* 12-word grid */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={`seed-input-${index}`} className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-neutral-500 font-medium z-10">
              {index + 1}.
            </span>
            <input
              type="text"
              value={seedWords[index]}
              onChange={(e) => handleWordChange(index, e.target.value)}
              onPaste={handlePaste}
              onKeyDown={(e) => handleKeyDown(e, index)}
              placeholder="word"
              className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg py-2.5 pl-8 pr-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-brand-orange focus:bg-[#1a1a1a] transition-all"
              autoFocus={index === 0}
            />
          </div>
        ))}
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={isBusy}
          className="flex-1 py-3.5 px-5 rounded-xl bg-white/6 text-neutral-300 text-sm font-bold border border-white/10 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <button
          onClick={onRestore}
          disabled={isBusy || !isComplete}
          className="flex-2 relative py-3.5 px-5 rounded-xl bg-linear-to-r from-brand-orange to-brand-orange-dark text-white text-sm font-bold shadow-xl shadow-brand-orange/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group"
        >
          <div className="absolute inset-0 bg-linear-to-r from-brand-orange to-brand-orange-dark opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="relative z-10 flex items-center gap-2">
            {isBusy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Restoring...
              </>
            ) : (
              <>
                Restore
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </span>
        </button>
      </div>

      {error && (
        <p className="mt-3 text-red-400 text-xs bg-red-500/10 border border-red-500/20 p-2 rounded-lg">
          {error}
        </p>
      )}
    </div>
  );
}
