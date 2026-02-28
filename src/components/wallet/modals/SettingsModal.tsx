import { useState } from 'react';
import { Settings, Download, LogOut, Key, Link } from 'lucide-react';
import { BaseModal, ModalHeader, MenuButton } from '@/components/ui';
import { LookupModal } from './LookupModal';
import { ConnectedSitesModal } from './ConnectedSitesModal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackupWallet: () => void;
  onLogout: () => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  onBackupWallet,
  onLogout,
}: SettingsModalProps) {
  const [isLookupOpen, setIsLookupOpen] = useState(false);
  const [isConnectedSitesOpen, setIsConnectedSitesOpen] = useState(false);

  return (
    <>
      <BaseModal isOpen={isOpen} onClose={onClose} size="sm" showOrbs={false}>
        <ModalHeader title="Settings" icon={Settings} iconVariant="neutral" onClose={onClose} />

        <div className="p-4 space-y-2 overflow-y-auto">
          <MenuButton
            icon={Key}
            color="orange"
            label="My Public Keys"
            onClick={() => {
              onClose();
              setIsLookupOpen(true);
            }}
          />

          <MenuButton
            icon={Link}
            color="blue"
            label="Connected Sites"
            onClick={() => {
              onClose();
              setIsConnectedSitesOpen(true);
            }}
          />

          <MenuButton
            icon={Download}
            color="green"
            label="Backup Wallet"
            subtitle={undefined}
            showChevron={false}
            onClick={() => {
              onClose();
              onBackupWallet();
            }}
          />

          <MenuButton
            icon={LogOut}
            color="red"
            label="Logout"
            danger
            onClick={() => {
              onClose();
              onLogout();
            }}
          />
        </div>
      </BaseModal>

      <LookupModal
        isOpen={isLookupOpen}
        onClose={() => setIsLookupOpen(false)}
      />

      <ConnectedSitesModal
        isOpen={isConnectedSitesOpen}
        onClose={() => setIsConnectedSitesOpen(false)}
      />
    </>
  );
}
