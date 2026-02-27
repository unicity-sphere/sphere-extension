/**
 * ConnectIntentModal — shown when a dApp triggers a wallet intent via Connect protocol.
 *
 * Polls background for pending intent, shows intent action + params,
 * and resolves via POPUP_RESOLVE_CONNECT_INTENT message.
 */

import { useEffect, useState } from 'react';
import { ArrowUpRight, Zap } from 'lucide-react';
import { BaseModal } from '@/components/ui/BaseModal';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { Button } from '@/components/ui/Button';

interface PendingIntent {
  id: string;
  action: string;
  params: Record<string, unknown>;
  session: {
    sessionId: string;
    dapp: { name: string; url: string; icon?: string };
  };
}

interface ConnectIntentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ACTION_LABELS: Record<string, string> = {
  send: 'Send Tokens',
  l1_send: 'Send (L1)',
  sign_message: 'Sign Message',
  dm: 'Send Direct Message',
  payment_request: 'Payment Request',
  receive: 'Receive Tokens',
};

const ACTION_ICONS: Record<string, typeof ArrowUpRight> = {
  send: ArrowUpRight,
  l1_send: ArrowUpRight,
  sign_message: Zap,
  dm: Zap,
  payment_request: Zap,
  receive: Zap,
};

function formatParamKey(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
}

function formatParamValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return JSON.stringify(value);
}

export function ConnectIntentModal({ isOpen, onClose }: ConnectIntentModalProps) {
  const [intent, setIntent] = useState<PendingIntent | null>(null);
  const [loading, setLoading] = useState(false);

  // Poll for pending intent when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const poll = async () => {
      try {
        const response = await chrome.runtime.sendMessage({ type: 'POPUP_GET_CONNECT_INTENT' });
        if (response?.intent) {
          setIntent(response.intent);
        } else {
          setIntent(null);
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
    if (!intent) return;
    setLoading(true);
    try {
      await chrome.runtime.sendMessage({
        type: 'POPUP_RESOLVE_CONNECT_INTENT',
        id: intent.id,
        result: { result: { approved: true } },
      });
      onClose();
    } catch (err) {
      console.error('[ConnectIntentModal] approve error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!intent) return;
    setLoading(true);
    try {
      await chrome.runtime.sendMessage({
        type: 'POPUP_RESOLVE_CONNECT_INTENT',
        id: intent.id,
        result: { error: { code: 4001, message: 'User rejected' } },
      });
      onClose();
    } catch (err) {
      console.error('[ConnectIntentModal] reject error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!intent) return null;

  const { action, params, session } = intent;
  const label = ACTION_LABELS[action] ?? action;
  const Icon = ACTION_ICONS[action] ?? Zap;

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalHeader title="Action Request" onClose={onClose} />

      <div className="p-4 space-y-4 overflow-y-auto">
        {/* dApp + action */}
        <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-white/10">
          <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center shrink-0">
            <Icon size={20} className="text-orange-500" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-neutral-900 dark:text-white">{label}</p>
            <p className="text-xs text-neutral-500 truncate">from {session?.dapp?.name ?? 'Unknown dApp'}</p>
          </div>
        </div>

        {/* Params */}
        {Object.keys(params).length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
              Details
            </p>
            <div className="rounded-xl border border-neutral-200 dark:border-white/10 divide-y divide-neutral-200 dark:divide-white/10 overflow-hidden">
              {Object.entries(params).map(([key, value]) => (
                <div key={key} className="flex items-start justify-between gap-3 px-3 py-2">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 shrink-0">
                    {formatParamKey(key)}
                  </span>
                  <span className="text-xs font-medium text-neutral-900 dark:text-white text-right break-all">
                    {formatParamValue(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 flex gap-2 border-t border-neutral-200 dark:border-white/10">
        <Button variant="secondary" fullWidth onClick={handleReject} loading={loading} disabled={loading}>
          Reject
        </Button>
        <Button variant="primary" fullWidth onClick={handleApprove} loading={loading} disabled={loading}>
          Approve
        </Button>
      </div>
    </BaseModal>
  );
}
