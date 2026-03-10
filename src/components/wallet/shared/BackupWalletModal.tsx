import { Download, Key, ShieldCheck } from 'lucide-react';
import { WalletScreen, MenuButton } from '@/components/ui';

interface BackupWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportWalletFile: () => void;
  onShowRecoveryPhrase: () => void;
  hasMnemonic?: boolean;
}

export function BackupWalletModal({
  isOpen,
  onClose,
  onExportWalletFile,
  onShowRecoveryPhrase,
  hasMnemonic = true,
}: BackupWalletModalProps) {
  return (
    <WalletScreen isOpen={isOpen} onClose={onClose}>
      <div className="relative px-6 py-5 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
          <ShieldCheck className="w-8 h-8 text-green-500" />
        </div>
        <h3 className="text-xl font-bold text-white mb-1">Backup Wallet</h3>
        <p className="text-sm text-[#ffe2cc]">
          Choose how you want to backup your wallet
        </p>
      </div>
      <div className="px-6 pb-6 space-y-3">
        <MenuButton
          icon={Download}
          color="blue"
          label="Export Wallet File"
          subtitle="Download encrypted JSON file"
          showChevron={false}
          onClick={() => { onClose(); onExportWalletFile(); }}
        />
        <MenuButton
          icon={Key}
          color="orange"
          label="Show Recovery Phrase"
          subtitle={hasMnemonic ? 'View 12-word seed phrase' : 'Not available for legacy wallets'}
          showChevron={false}
          disabled={!hasMnemonic}
          onClick={() => { onClose(); onShowRecoveryPhrase(); }}
        />
        <button
          onClick={onClose}
          className="w-full py-3 text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </WalletScreen>
  );
}
