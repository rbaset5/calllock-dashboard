'use client';

import { cn } from '@/lib/utils';
import { UrgencyTier, URGENCY_CONFIG } from '@/lib/urgency';
import type { NowItem } from '@/app/api/velocity/route';

interface NowCardProps {
  item: NowItem;
  onCall: (phone: string) => void;
  onTap: (item: NowItem) => void;
  onMarkLost?: (id: string) => void;
}

function getShortAddress(address: string | null): string {
  if (!address) return '';
  const parts = address.split(',');
  return parts[0].trim();
}

export function NowCard({ item, onCall, onTap, onMarkLost }: NowCardProps) {
  const config = URGENCY_CONFIG[item.urgencyTier];
  const shortAddress = getShortAddress(item.customer_address);
  const isGettingCold = item.urgencyTier === 'getting_cold';

  const handleCallClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCall(item.customer_phone);
  };

  const handleMarkLostClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkLost?.(item.id);
  };

  const handleCardClick = () => {
    onTap(item);
  };

  return (
    <article
      onClick={handleCardClick}
      className="group relative flex flex-col bg-white rounded-xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.1)] overflow-hidden transition-transform active:scale-[0.99] cursor-pointer"
    >
      <div className={cn(config.bgColor, 'px-4 py-2 flex items-center justify-between')}>
        <div className={cn('flex items-center gap-2', config.textColor)}>
          <span
            className={cn(
              'material-symbols-outlined text-[18px]',
              config.animate && 'animate-pulse'
            )}
          >
            {config.icon}
          </span>
          <p className="text-xs font-extrabold tracking-widest uppercase">
            {config.label} <span className="font-semibold opacity-80">• {item.time_ago}</span>
          </p>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3">
        <div className="flex flex-col">
          <h3 className="text-xl font-bold text-slate-900 leading-tight">
            {item.customer_name}
          </h3>
          <p className="text-slate-500 font-medium text-sm mt-1 line-clamp-1">
            {item.issue_summary}
          </p>
          <p className="text-slate-400 text-sm mt-1">
            {shortAddress && <span>{shortAddress}</span>}
            {shortAddress && item.revenue_display && <span> • </span>}
            {item.revenue_display && (
              <span className="font-semibold text-emerald-600">{item.revenue_display}</span>
            )}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          {isGettingCold && onMarkLost && (
            <button
              onClick={handleMarkLostClick}
              className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 px-3 py-2 rounded-lg transition-colors text-sm font-medium"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
              Mark Lost
            </button>
          )}
          <button
            onClick={handleCallClick}
            className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white pl-4 pr-5 py-2.5 rounded-lg shadow-lg shadow-primary/20 transition-all active:translate-y-0.5"
          >
            <span className="material-symbols-outlined text-[20px]">call</span>
            <span className="font-bold text-sm tracking-wide">Call Now</span>
          </button>
        </div>
      </div>
    </article>
  );
}
