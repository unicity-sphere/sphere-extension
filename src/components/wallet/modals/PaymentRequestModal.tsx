import { Check, Sparkles, Trash2, Loader2, XIcon, ArrowRight, Clock, Receipt, AlertCircle } from 'lucide-react';
import { useTransfer } from '@/sdk';
import { useState } from 'react';
import { WalletScreen, ModalHeader, EmptyState } from '@/components/ui';
import { getErrorMessage } from '@/sdk/errors';

export enum PaymentRequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  PAID = 'paid',
  REJECTED = 'rejected',
}

export interface IncomingPaymentRequest {
  id: string;
  requestId: string;
  senderPubkey: string;
  recipientNametag?: string;
  amount: number;
  coinId: string;
  symbol: string;
  message?: string;
  timestamp: number;
  status: PaymentRequestStatus;
}

interface PaymentRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requests: IncomingPaymentRequest[];
  pendingCount: number;
  reject: (request: IncomingPaymentRequest) => Promise<void>;
  paid: (request: IncomingPaymentRequest) => Promise<void>;
  clearProcessed: () => void;
}

export function PaymentRequestsModal({ isOpen, onClose, requests, pendingCount, reject, clearProcessed, paid }: PaymentRequestsModalProps) {
  const { transfer } = useTransfer();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const hasProcessed = requests.some(r => r.status !== PaymentRequestStatus.PENDING);
  const isGlobalProcessing = !!processingId;

  const handleSafeClose = () => {
    if (!isGlobalProcessing) {
      setErrors({});
      onClose();
    }
  };

  const handlePay = async (req: IncomingPaymentRequest) => {
    setProcessingId(req.id);
    setErrors(prev => ({ ...prev, [req.id]: '' }));
    try {
      const recipient = req.recipientNametag ? `@${req.recipientNametag}` : req.senderPubkey;
      await transfer({ recipient, amount: req.amount.toString(), coinId: req.coinId });
      paid(req);
    } catch (error: unknown) {
      setErrors(prev => ({ ...prev, [req.id]: getErrorMessage(error) }));
    } finally {
      setProcessingId(null);
    }
  };

  const subtitle = pendingCount > 0 ? (
    <div className="flex items-center gap-2">
      <span className="flex h-2 w-2 relative">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-orange opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-orange"></span>
      </span>
      <span className="text-brand-orange font-semibold">{pendingCount} pending</span>
    </div>
  ) : undefined;

  return (
    <WalletScreen isOpen={isOpen} onClose={handleSafeClose}>
      <ModalHeader title="Payment Requests" icon={Receipt} subtitle={subtitle} onClose={handleSafeClose} closeDisabled={isGlobalProcessing} />

      <div className="relative flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 z-10 min-h-0">
        {requests.length === 0 ? (
          <EmptyState icon={Sparkles} title="No Requests" description="Incoming payment requests will appear here" />
        ) : (
          requests.map((req) => (
            <RequestCard
              key={req.id}
              req={req}
              error={errors[req.id]}
              onPay={() => handlePay(req)}
              onReject={() => reject(req)}
              isProcessing={processingId === req.id}
              isGlobalDisabled={isGlobalProcessing}
            />
          ))
        )}
      </div>

      {hasProcessed && (
        <div className="relative shrink-0 p-4 border-t border-white/10 backdrop-blur-xl z-20">
          <button
            onClick={clearProcessed}
            disabled={isGlobalProcessing}
            className="w-full py-3 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-500 hover:text-red-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all disabled:opacity-50 border border-white/10 hover:border-red-500/30"
          >
            <Trash2 className="w-4 h-4" /> Clear History
          </button>
        </div>
      )}
    </WalletScreen>
  );
}

interface RequestCardProps {
  req: IncomingPaymentRequest;
  error?: string;
  onPay: () => void;
  onReject: () => void;
  isProcessing: boolean;
  isGlobalDisabled: boolean;
}

function RequestCard({ req, error, onPay, onReject, isProcessing, isGlobalDisabled }: RequestCardProps) {
  const isPending = req.status === PaymentRequestStatus.PENDING;
  const timeAgo = getTimeAgo(req.timestamp);

  const statusConfig = {
    [PaymentRequestStatus.ACCEPTED]: { color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: Check, label: 'Payment Sent' },
    [PaymentRequestStatus.PAID]: { color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: Check, label: 'Paid Successfully' },
    [PaymentRequestStatus.REJECTED]: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: XIcon, label: 'Request Declined' },
    [PaymentRequestStatus.PENDING]: { color: 'text-brand-orange', bg: 'bg-brand-orange/10', border: 'border-brand-orange/20', icon: Clock, label: 'Awaiting Payment' },
  };

  const currentStatus = statusConfig[req.status];
  const StatusIcon = currentStatus.icon;
  const isDisabled = isGlobalDisabled && !isProcessing;

  return (
    <div className={`relative rounded-2xl overflow-hidden border transition-all duration-300 ${isPending
      ? 'bg-white/6 border-white/10 shadow-xl shadow-black/20'
      : 'bg-white/4 border-white/6 opacity-70'
    } ${isDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
      {isPending && <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-brand-orange via-brand-orange to-brand-orange-dark" />}

      <div className="p-5">
        <div className="flex justify-between items-start mb-5">
          <div className="flex flex-col">
            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1.5">From</span>
            <span className="text-white font-bold text-base">
              {req.recipientNametag ? `@${req.recipientNametag}` : `${req.senderPubkey.slice(0, 12)}...`}
            </span>
          </div>
          <div className="bg-white/6 px-2.5 py-1 rounded-lg text-[10px] text-[#ffe2cc] font-medium">
            {timeAgo}
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-3 mb-4">
          <div className="text-4xl font-black text-white tracking-tight flex items-baseline gap-2">
            {req.amount} <span className="text-xl text-brand-orange font-bold">{req.symbol}</span>
          </div>
          {req.message && (
            <div className="mt-4 text-xs text-neutral-300 bg-white/6 px-4 py-2 rounded-xl border border-white/8 max-w-full">
              <span className="text-neutral-500">"</span>{req.message}<span className="text-neutral-500">"</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 bg-white/4 border-t border-white/10">
        {isPending ? (
          <div className="flex flex-col gap-3">
            {error && (
              <div className="flex items-center justify-center gap-2 text-red-400 text-xs font-semibold bg-red-500/10 py-2.5 rounded-xl border border-red-500/30">
                <AlertCircle className="w-3.5 h-3.5" />
                {error}
              </div>
            )}
            <div className="grid grid-cols-[1fr_2fr] gap-3">
              <button
                onClick={onReject}
                disabled={isGlobalDisabled}
                className="py-3 rounded-xl font-bold text-xs bg-white/6 text-[#ffe2cc] hover:text-white hover:bg-white/8 border border-white/10 transition-all active:scale-[0.97]"
              >
                Decline
              </button>
              <button
                onClick={onPay}
                disabled={isGlobalDisabled}
                className="relative py-3 rounded-xl font-bold text-sm text-white bg-linear-to-r from-brand-orange to-brand-orange-dark shadow-xl shadow-brand-orange/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:shadow-none overflow-hidden active:scale-[0.97]"
              >
                {isProcessing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Processing</>
                ) : (
                  <>Pay Now <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className={`flex items-center justify-center gap-2 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg ${currentStatus.bg} ${currentStatus.color} border ${currentStatus.border}`}>
            <StatusIcon className="w-4 h-4" />
            {currentStatus.label}
          </div>
        )}
      </div>
    </div>
  );
}

const getTimeAgo = (timestamp: number) => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};
