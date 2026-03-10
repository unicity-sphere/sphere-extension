import { Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  /** Icon to display */
  icon?: LucideIcon;
  /** Main title text */
  title: string;
  /** Description text or ReactNode */
  description?: ReactNode;
  /** Action button */
  action?: ReactNode;
}

export function EmptyState({
  icon: Icon = Sparkles,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="h-full min-h-75 flex flex-col items-center justify-center text-center py-12">
      <div className="relative w-20 h-20 mb-6">
        <div className="absolute inset-0 bg-brand-orange/20 rounded-3xl blur-xl" />
        <div className="relative w-full h-full bg-white/6 rounded-3xl flex items-center justify-center border border-white/10">
          <Icon className="w-10 h-10 text-brand-orange" />
        </div>
      </div>

      <p className="text-white font-bold text-lg mb-2">{title}</p>

      {description && (
        <p className="text-[#ffe2cc] text-sm max-w-55 leading-relaxed">
          {description}
        </p>
      )}

      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
