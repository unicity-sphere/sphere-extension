/**
 * ConnectApprovalModal — shown when a dApp requests connection via Connect protocol.
 *
 * Polls background for pending approval, shows dApp info + permissions,
 * and resolves via POPUP_RESOLVE_CONNECT_APPROVAL message.
 */

import { useEffect, useState } from 'react';
import { Globe, Shield, CheckCircle2 } from 'lucide-react';
import { BaseModal } from '@/components/ui/BaseModal';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { Button } from '@/components/ui/Button';

// Mirrors the server-side PendingConnectApproval (without resolve fn)
interface PendingApproval {
  id: string;
  dapp: {
    name: string;
    description?: string;
    icon?: string;
    url: string;
  };
  requestedPermissions: string[];
}

interface ConnectApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PERMISSION_LABELS: Record<string, string> = {
  'identity:read': 'Read wallet identity',
  'balance:read': 'View balances',
  'assets:read': 'View assets',
  'history:read': 'View transaction history',
  'intent:send': 'Request token transfers',
  'intent:l1_send': 'Request L1 transfers',
  'intent:sign_message': 'Request message signing',
  'intent:dm': 'Send direct messages',
  'intent:payment_request': 'Create payment requests',
  'intent:receive': 'Receive tokens',
  'events:subscribe': 'Listen to wallet events',
};

export function ConnectApprovalModal({ isOpen, onClose }: ConnectApprovalModalProps) {
  const [approval, setApproval] = useState<PendingApproval | null>(null);
  const [loading, setLoading] = useState(false);

  // Poll for pending approval when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const poll = async () => {
      try {
        const response = await chrome.runtime.sendMessage({ type: 'POPUP_GET_CONNECT_APPROVAL' });
        if (response?.approval) {
          setApproval(response.approval);
        } else {
          setApproval(null);
        }
      } catch {
        // Background may not be ready
      }
    };

    poll();
    const interval = setInterval(poll, 500);
    return () => clearInterval(interval);
  }, [isOpen]);

  const handleApprove = async () => {
    if (!approval) return;
    setLoading(true);
    try {
      await chrome.runtime.sendMessage({
        type: 'POPUP_RESOLVE_CONNECT_APPROVAL',
        id: approval.id,
        approved: true,
        grantedPermissions: approval.requestedPermissions,
      });
      onClose();
    } catch (err) {
      console.error('[ConnectApprovalModal] approve error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!approval) return;
    setLoading(true);
    try {
      await chrome.runtime.sendMessage({
        type: 'POPUP_RESOLVE_CONNECT_APPROVAL',
        id: approval.id,
        approved: false,
        grantedPermissions: [],
      });
      onClose();
    } catch (err) {
      console.error('[ConnectApprovalModal] reject error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!approval) return null;

  const { dapp, requestedPermissions } = approval;

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalHeader title="Connect Request" onClose={onClose} />

      <div className="p-4 space-y-4 overflow-y-auto">
        {/* dApp identity */}
        <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-white/10">
          {dapp.icon ? (
            <img src={dapp.icon} alt={dapp.name} className="w-10 h-10 rounded-xl" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center">
              <Globe size={20} className="text-orange-500" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-sm text-neutral-900 dark:text-white truncate">{dapp.name}</p>
            <p className="text-xs text-neutral-500 truncate">{dapp.url}</p>
            {dapp.description && (
              <p className="text-xs text-neutral-400 mt-0.5 line-clamp-2">{dapp.description}</p>
            )}
          </div>
        </div>

        {/* Permissions list */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Shield size={14} className="text-neutral-400" />
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
              Requested permissions
            </span>
          </div>
          <ul className="space-y-1.5">
            {requestedPermissions.map((perm) => (
              <li key={perm} className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                <span>{PERMISSION_LABELS[perm] ?? perm}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 flex gap-2 border-t border-neutral-200 dark:border-white/10">
        <Button variant="secondary" fullWidth onClick={handleReject} loading={loading} disabled={loading}>
          Reject
        </Button>
        <Button variant="primary" fullWidth onClick={handleApprove} loading={loading} disabled={loading}>
          Connect
        </Button>
      </div>
    </BaseModal>
  );
}
