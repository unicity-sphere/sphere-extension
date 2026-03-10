/**
 * RestoreMethodScreen - Choose restore method
 * Ported from sphere web app — minus framer-motion
 */
import { KeyRound, Upload, ArrowRight, ArrowLeft } from "lucide-react";

interface RestoreMethodScreenProps {
  isBusy: boolean;
  error: string | null;
  onSelectMnemonic: () => void;
  onBack: () => void;
}

export function RestoreMethodScreen({
  isBusy,
  error,
  onSelectMnemonic,
  onBack,
}: RestoreMethodScreenProps) {
  return (
    <div className="relative z-10 w-full max-w-90">
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
      <p className="text-[#ffe2cc] text-sm mb-7 mx-auto leading-relaxed">
        Choose how you want to restore your wallet
      </p>

      <div className="space-y-3 mb-5">
        {/* Recovery Phrase Option */}
        <button
          onClick={onSelectMnemonic}
          className="w-full p-4 rounded-xl bg-white/6 border border-white/10 hover:border-brand-orange/50 transition-all text-left group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-orange/10 flex items-center justify-center group-hover:bg-brand-orange/20 transition-colors">
              <KeyRound className="w-6 h-6 text-brand-orange" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-white mb-0.5">
                Recovery Phrase
              </div>
              <div className="text-xs text-[#ffe2cc]">
                Use your 12-word mnemonic phrase
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-brand-orange transition-colors" />
          </div>
        </button>

        {/* Import from File Option — disabled for now */}
        <button
          disabled
          className="w-full p-4 rounded-xl bg-white/6 border border-white/10 text-left opacity-50 cursor-not-allowed"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-orange/10 flex items-center justify-center">
              <Upload className="w-6 h-6 text-brand-orange" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-white mb-0.5 flex items-center gap-2">
                Import from File
                <span className="text-[10px] font-medium text-neutral-400 bg-white/8 px-1.5 py-0.5 rounded">
                  Soon
                </span>
              </div>
              <div className="text-xs text-[#ffe2cc]">
                Import wallet from .json, .dat or .txt file
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-neutral-400" />
          </div>
        </button>
      </div>

      {/* Back Button */}
      <button
        onClick={onBack}
        disabled={isBusy}
        className="w-full py-3.5 px-5 rounded-xl bg-white/6 text-neutral-300 text-sm font-bold border border-white/10 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {error && (
        <p className="mt-3 text-red-400 text-xs bg-red-500/10 border border-red-500/20 p-2 rounded-lg">
          {error}
        </p>
      )}
    </div>
  );
}
