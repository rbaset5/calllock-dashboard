'use client';

import { differenceInMinutes } from 'date-fns';
import { cn } from '@/lib/utils';

interface CallbackCardProps {
  lead: {
    id: string;
    customer_name: string;
    customer_phone: string;
    customer_address?: string;
    ai_summary?: string;
    issue_description?: string;
    created_at: string;
    revenue_tier?: string;
    revenue_tier_label?: string;
    urgency?: string;
  };
  onCall: (phone: string) => void;
}

function getUrgencyConfig(createdAt: string) {
  const minutes = differenceInMinutes(new Date(), new Date(createdAt));
  
  if (minutes < 5) {
    return {
      bgColor: 'bg-red-500',
      icon: 'timer',
      animate: true,
      text: `${minutes} MIN${minutes !== 1 ? 'S' : ''} AGO`,
    };
  }
  
  if (minutes < 15) {
    return {
      bgColor: 'bg-orange-400',
      icon: 'history',
      animate: false,
      text: `${minutes} MINS AGO`,
    };
  }
  
  if (minutes < 60) {
    return {
      bgColor: 'bg-slate-400',
      icon: 'schedule',
      animate: false,
      text: `${minutes} MINS AGO`,
    };
  }
  
  const hours = Math.floor(minutes / 60);
  return {
    bgColor: 'bg-slate-400',
    icon: 'schedule',
    animate: false,
    text: hours === 1 ? '1 HOUR AGO' : `${hours} HOURS AGO`,
  };
}

function extractIssue(lead: CallbackCardProps['lead']): string {
  if (lead.issue_description) return lead.issue_description;
  if (lead.ai_summary) {
    const firstSentence = lead.ai_summary.split(/[.!?]/)[0].trim();
    return firstSentence.length > 50 ? firstSentence.slice(0, 50) + '...' : firstSentence;
  }
  return 'Service call';
}

function getShortAddress(address?: string): string {
  if (!address) return '';
  const parts = address.split(',');
  return parts[0].trim();
}

function isHighValue(revenueTier?: string): boolean {
  return revenueTier === '$$' || revenueTier === '$$$' || revenueTier === '$$$$';
}

export function CallbackCard({ lead, onCall }: CallbackCardProps) {
  const urgency = getUrgencyConfig(lead.created_at);
  const issue = extractIssue(lead);
  const shortAddress = getShortAddress(lead.customer_address);
  const highValue = isHighValue(lead.revenue_tier);
  const isHazard = lead.urgency === 'emergency' || lead.urgency === 'high';

  const handleCallClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCall(lead.customer_phone);
  };

  return (
    <article className="group relative flex flex-col bg-white rounded-xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.1)] overflow-hidden transition-transform active:scale-[0.99]">
      <div className={cn(urgency.bgColor, 'px-4 py-2 flex items-center justify-between')}>
        <div className="flex items-center gap-2 text-white">
          <span
            className={cn(
              'material-symbols-outlined text-[18px]',
              urgency.animate && 'animate-pulse'
            )}
          >
            {urgency.icon}
          </span>
          <p className="text-xs font-extrabold tracking-widest uppercase">{urgency.text}</p>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <h3 className="text-xl font-bold text-slate-900 leading-tight">
              {lead.customer_name}
            </h3>
            <p className="text-slate-500 font-medium text-sm mt-1">{issue}</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-slate-400">person</span>
          </div>
        </div>

        {(highValue || isHazard) && (
          <div className="flex flex-wrap gap-2">
            {highValue && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                <span className="material-symbols-outlined text-[14px]">payments</span>
                High Value
              </span>
            )}
            {isHazard && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-bold border border-amber-100">
                <span className="material-symbols-outlined text-[14px]">warning</span>
                Hazard
              </span>
            )}
          </div>
        )}

        <div className="flex items-end justify-between mt-1 pt-3 border-t border-slate-100">
          <div className="flex flex-col gap-1 pr-4">
            {shortAddress && (
              <p className="text-sm font-medium text-slate-600 truncate max-w-[140px]">
                {shortAddress}
              </p>
            )}
          </div>
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
