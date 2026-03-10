/**
 * StartScreen - Initial onboarding screen
 * Ported from sphere web app — no passwords, clean layout
 */
import { ArrowRight, Loader2, KeyRound } from "lucide-react";
import { UnionIcon } from "@/components/ui/UnionIcon";

interface StartScreenProps {
  isBusy: boolean;
  error: string | null;
  progressMessage?: string | null;
  onCreateWallet: () => void;
  onRestore: () => void;
}

export function StartScreen({
  isBusy,
  error,
  progressMessage,
  onCreateWallet,
  onRestore,
}: StartScreenProps) {
  return (
    <div className="relative z-10 w-full max-w-90">
      {/* Icon with glow effect */}
      <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center">
        <div className="absolute inset-0 bg-brand-orange rounded-full blur-2xl opacity-30" />
        <UnionIcon size={56} className="relative" />
      </div>

      <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
        No Wallet Found
      </h2>
      <p className="text-[#ffe2cc] text-sm mb-7 mx-auto leading-relaxed">
        Create a new secure wallet to start using{" "}
        <span className="text-brand-orange font-semibold whitespace-nowrap">
          the Unicity Network
        </span>
      </p>

      <button
        onClick={onCreateWallet}
        disabled={isBusy}
        className="relative w-full py-3.5 px-5 rounded-xl bg-linear-to-r from-brand-orange to-brand-orange-dark text-white text-sm font-bold shadow-xl shadow-brand-orange/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group"
      >
        <div className="absolute inset-0 bg-linear-to-r from-brand-orange to-brand-orange-dark opacity-0 group-hover:opacity-100 transition-opacity" />
        <span className="relative z-10 flex items-center gap-2">
          {isBusy ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              Create New Wallet
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </span>
      </button>

      {isBusy && progressMessage && (
        <div className="flex items-center justify-center gap-2 text-[#ffe2cc] text-[11px] mt-2.5">
          <Loader2 className="w-3 h-3 animate-spin text-brand-orange" />
          <span>{progressMessage}</span>
        </div>
      )}

      <button
        onClick={onRestore}
        disabled={isBusy}
        className="relative w-full py-3.5 px-5 rounded-xl bg-white/6 text-neutral-300 text-sm font-bold border border-white/10 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-3 hover:bg-white/8 transition-colors"
      >
        <KeyRound className="w-4 h-4" />
        Restore Wallet
      </button>

      {error && (
        <p className="mt-3 text-red-400 text-xs bg-red-500/10 border border-red-500/20 p-2 rounded-lg">
          {error}
        </p>
      )}
    </div>
  );
}
