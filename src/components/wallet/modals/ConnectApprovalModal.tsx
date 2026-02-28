/**
 * ConnectApprovalModal — shown when a dApp requests connection via Connect protocol.
 *
 * Polls background for pending approval, shows dApp info + per-permission checkboxes,
 * and resolves via POPUP_RESOLVE_CONNECT_APPROVAL message.
 * identity:read is always granted and cannot be unchecked (mirrors sphere behaviour).
 */

import { useEffect, useState } from 'react';
import { Globe, Shield } from 'lucide-react';
import { PERMISSION_SCOPES } from '@unicitylabs/sphere-sdk/connect';
import type { PermissionScope } from '@unicitylabs/sphere-sdk/connect';
import { BaseModal } from '@/components/ui/BaseModal';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { Button } from '@/components/ui/Button';
import { POPUP_MESSAGES } from '@/shared/messages';

interface PendingApproval {
  id: string;
  dapp: {
    name: string;
    description?: string;
    icon?: string;
    url: string;
  };
  requestedPermissions: PermissionScope[];
}

interface ConnectApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PERMISSION_LABELS: Record<string, string> = {
  [PERMISSION_SCOPES.IDENTITY_READ]: 'View wallet identity',
  [PERMISSION_SCOPES.BALANCE_READ]: 'View balances',
  [PERMISSION_SCOPES.TOKENS_READ]: 'View tokens',
  [PERMISSION_SCOPES.HISTORY_READ]: 'View transaction history',
  [PERMISSION_SCOPES.L1_READ]: 'View L1 data',
  [PERMISSION_SCOPES.EVENTS_SUBSCRIBE]: 'Subscribe to wallet events',
  [PERMISSION_SCOPES.RESOLVE_PEER]: 'Resolve addresses',
  [PERMISSION_SCOPES.TRANSFER_REQUEST]: 'Request token transfers',
  [PERMISSION_SCOPES.L1_TRANSFER]: 'Request L1 transfers',
  [PERMISSION_SCOPES.DM_REQUEST]: 'Send direct messages',
  [PERMISSION_SCOPES.DM_READ]: 'Read direct messages',
  [PERMISSION_SCOPES.PAYMENT_REQUEST]: 'Create payment requests',
  [PERMISSION_SCOPES.SIGN_REQUEST]: 'Sign messages',
};

export function ConnectApprovalModal({ isOpen, onClose }: ConnectApprovalModalProps) {
  const [approval, setApproval] = useState<PendingApproval | null>(null);
  const [selected, setSelected] = useState<Set<PermissionScope>>(new Set());
  const [loading, setLoading] = useState(false);

  // Poll for pending approval when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const poll = async () => {
      try {
        const response = await chrome.runtime.sendMessage({ type: POPUP_MESSAGES.GET_CONNECT_APPROVAL });
        if (response?.approval) {
          const incoming = response.approval as PendingApproval;
          setApproval(incoming);
          // Initialise selected set: all requested + identity:read always included
          setSelected((prev) => {
            if (prev.size > 0) return prev; // already initialised for this approval
            const initial = new Set(incoming.requestedPermissions);
            initial.add(PERMISSION_SCOPES.IDENTITY_READ as PermissionScope);
            return initial;
          });
        } else {
          setApproval(null);
          setSelected(new Set());
        }
      } catch {
        // Background may not be ready yet
      }
    };

    poll();
    const interval = setInterval(poll, 500);
    return () => clearInterval(interval);
  }, [isOpen]);

  const togglePermission = (perm: PermissionScope) => {
    if (perm === PERMISSION_SCOPES.IDENTITY_READ) return; // always granted
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(perm)) {
        next.delete(perm);
      } else {
        next.add(perm);
      }
      return next;
    });
  };

  const handleApprove = async () => {
    if (!approval) return;
    setLoading(true);
    try {
      await chrome.runtime.sendMessage({
        type: POPUP_MESSAGES.RESOLVE_CONNECT_APPROVAL,
        id: approval.id,
        approved: true,
        grantedPermissions: [...selected],
      });
      setSelected(new Set());
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
        type: POPUP_MESSAGES.RESOLVE_CONNECT_APPROVAL,
        id: approval.id,
        approved: false,
        grantedPermissions: [],
      });
      setSelected(new Set());
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
    <BaseModal isOpen={isOpen} onClose={handleReject} size="sm">
      <ModalHeader title="Connect Request" onClose={handleReject} />

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

        {/* Permissions list with checkboxes */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Shield size={14} className="text-neutral-400" />
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
              Permissions
            </span>
          </div>
          <div className="space-y-1">
            {requestedPermissions.map((perm) => {
              const isIdentity = perm === PERMISSION_SCOPES.IDENTITY_READ;
              return (
                <label
                  key={perm}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/30 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(perm)}
                    onChange={() => togglePermission(perm)}
                    disabled={isIdentity}
                    className="w-4 h-4 rounded accent-orange-500 shrink-0"
                  />
                  <span className={`text-sm ${isIdentity ? 'text-neutral-400 dark:text-neutral-500' : 'text-neutral-700 dark:text-neutral-300'}`}>
                    {PERMISSION_LABELS[perm] ?? perm}
                  </span>
                  {isIdentity && (
                    <span className="text-xs text-neutral-400 ml-auto whitespace-nowrap">Always granted</span>
                  )}
                </label>
              );
            })}
          </div>
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
