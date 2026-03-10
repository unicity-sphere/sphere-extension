import { ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type MenuButtonColor = 'blue' | 'green' | 'red' | 'orange' | 'purple' | 'neutral';

interface MenuButtonProps {
  /** Icon to display */
  icon: LucideIcon;
  /** Icon background color */
  color?: MenuButtonColor;
  /** Main label text */
  label: string;
  /** Optional subtitle */
  subtitle?: ReactNode;
  /** Click handler */
  onClick: () => void;
  /** Show chevron arrow */
  showChevron?: boolean;
  /** Danger variant (red text) */
  danger?: boolean;
  /** Disabled state */
  disabled?: boolean;
}

const colorClasses: Record<MenuButtonColor, { bg: string; icon: string }> = {
  blue: { bg: 'bg-blue-500/10', icon: 'text-blue-400' },
  green: { bg: 'bg-green-500/10', icon: 'text-green-400' },
  red: { bg: 'bg-red-500/10', icon: 'text-red-400' },
  orange: { bg: 'bg-brand-orange/10', icon: 'text-brand-orange' },
  purple: { bg: 'bg-purple-500/10', icon: 'text-purple-400' },
  neutral: { bg: 'bg-white/6', icon: 'text-neutral-400' },
};

export function MenuButton({
  icon: Icon,
  color = 'blue',
  label,
  subtitle,
  onClick,
  showChevron = true,
  danger = false,
  disabled = false,
}: MenuButtonProps) {
  const colorConfig = colorClasses[color];

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-4 p-4 bg-white/4 rounded-2xl transition-colors group ${
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : danger
            ? 'hover:bg-red-900/10'
            : 'hover:bg-white/8'
      }`}
    >
      <div className={`w-12 h-12 rounded-xl ${colorConfig.bg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-6 h-6 ${colorConfig.icon}`} />
      </div>
      <div className="flex-1 text-left min-w-0">
        <span className={`font-semibold block ${danger ? 'text-red-400' : 'text-white'}`}>
          {label}
        </span>
        {subtitle && (
          <span className="text-xs text-[#ffe2cc] truncate block">
            {subtitle}
          </span>
        )}
      </div>
      {showChevron && !danger && !disabled && (
        <ChevronRight className="w-5 h-5 text-neutral-500 group-hover:text-neutral-300 transition-colors shrink-0" />
      )}
    </button>
  );
}
