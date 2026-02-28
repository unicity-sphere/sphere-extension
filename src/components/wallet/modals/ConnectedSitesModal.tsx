import { useState, useEffect, useCallback } from 'react';
import { Globe, Trash2, Loader2, Link } from 'lucide-react';
import { BaseModal, ModalHeader, EmptyState } from '@/components/ui';
import type { ApprovedOriginEntry } from '@/platform/extension/background/connect-host';
import { POPUP_MESSAGES } from '@/shared/messages';

interface ConnectedSitesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SiteEntry {
  origin: string;
  data: ApprovedOriginEntry;
}

function formatLastSeen(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function getFaviconUrl(origin: string): string {
  return `${origin}/favicon.ico`;
}

export function ConnectedSitesModal({ isOpen, onClose }: ConnectedSitesModalProps) {
  const [sites, setSites] = useState<SiteEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [revokingOrigin, setRevokingOrigin] = useState<string | null>(null);

  const loadSites = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await chrome.runtime.sendMessage({ type: POPUP_MESSAGES.GET_CONNECTED_SITES });
      if (response?.success && response.sites) {
        const entries = Object.entries(response.sites as Record<string, ApprovedOriginEntry>)
          .map(([origin, data]) => ({ origin, data }))
          .sort((a, b) => b.data.lastSeenAt - a.data.lastSeenAt);
        setSites(entries);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadSites();
    }
  }, [isOpen, loadSites]);

  const handleRevoke = useCallback(async (origin: string) => {
    setRevokingOrigin(origin);
    try {
      await chrome.runtime.sendMessage({ type: POPUP_MESSAGES.REVOKE_CONNECTED_SITE, origin });
      setSites((prev) => prev.filter((s) => s.origin !== origin));
    } catch {
      // ignore
    } finally {
      setRevokingOrigin(null);
    }
  }, []);

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size="sm" showOrbs={false}>
      <ModalHeader title="Connected Sites" icon={Link} iconVariant="neutral" onClose={onClose} />

      <div className="overflow-y-auto flex-1 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
          </div>
        ) : sites.length === 0 ? (
          <EmptyState
            icon={Globe}
            title="No connected sites"
            description="Sites you connect to will appear here"
          />
        ) : (
          <div className="space-y-2">
            {sites.map(({ origin, data }) => (
              <div
                key={origin}
                className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl"
              >
                {/* Favicon */}
                <div className="w-10 h-10 rounded-xl bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center shrink-0 overflow-hidden">
                  <img
                    src={getFaviconUrl(origin)}
                    alt=""
                    className="w-6 h-6 object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                      (e.currentTarget.parentElement as HTMLElement).innerHTML =
                        `<span class="text-xs font-bold text-neutral-400">${origin.replace(/^https?:\/\//, '').charAt(0).toUpperCase()}</span>`;
                    }}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                    {data.dapp.name || origin.replace(/^https?:\/\//, '')}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                    {origin.replace(/^https?:\/\//, '')}
                  </p>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
                    Last seen {formatLastSeen(data.lastSeenAt)}
                  </p>
                </div>

                {/* Disconnect button */}
                <button
                  onClick={() => handleRevoke(origin)}
                  disabled={revokingOrigin === origin}
                  className="p-2 rounded-xl text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors disabled:opacity-50 shrink-0"
                  title="Disconnect"
                >
                  {revokingOrigin === origin ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </BaseModal>
  );
}
