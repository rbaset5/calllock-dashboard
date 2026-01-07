'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { URGENCY_CONFIG } from '@/lib/urgency';
import type { NowItem } from '@/app/api/velocity/route';

interface DetailDrawerProps {
  item: NowItem | null;
  open: boolean;
  onClose: () => void;
  onBook: (item: NowItem) => void;
  onSnooze: (item: NowItem) => void;
  onMarkLost: (item: NowItem) => void;
  onCall: (phone: string) => void;
  onNavigate: (address: string) => void;
}

export function DetailDrawer({
  item,
  open,
  onClose,
  onBook,
  onSnooze,
  onMarkLost,
  onCall,
  onNavigate,
}: DetailDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!item) return null;

  const config = URGENCY_CONFIG[item.urgencyTier];

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 transition-opacity duration-200',
        open ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
      onClick={handleBackdropClick}
    >
      <div className="absolute inset-0 bg-black/40" />

      <div
        ref={drawerRef}
        className={cn(
          'absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out max-h-[85vh] overflow-y-auto',
          open ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        <div className="sticky top-0 bg-white pt-3 pb-2 px-4 border-b border-slate-100">
          <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">{item.customer_name}</h2>
            <button
              onClick={onClose}
              className="p-2 -mr-2 text-slate-400 hover:text-slate-600 rounded-full"
            >
              <span className="material-symbols-outlined text-[24px]">close</span>
            </button>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold',
                config.bgColor,
                config.textColor
              )}
            >
              <span className="material-symbols-outlined text-[14px]">{config.icon}</span>
              {config.label}
            </span>
            <span className="text-slate-400 text-sm">{item.time_ago}</span>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {item.customer_address && (
            <button
              onClick={() => onNavigate(item.customer_address!)}
              className="flex items-start gap-3 w-full text-left p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <span className="material-symbols-outlined text-slate-400 text-[20px] mt-0.5">
                location_on
              </span>
              <div className="flex-1">
                <p className="text-slate-700 font-medium">{item.customer_address}</p>
                <p className="text-primary text-sm font-medium mt-0.5">Open in Maps</p>
              </div>
              <span className="material-symbols-outlined text-slate-300 text-[20px]">
                chevron_right
              </span>
            </button>
          )}

          <button
            onClick={() => onCall(item.customer_phone)}
            className="flex items-center gap-3 w-full text-left p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <span className="material-symbols-outlined text-slate-400 text-[20px]">call</span>
            <div className="flex-1">
              <p className="text-slate-700 font-medium">{item.customer_phone}</p>
              <p className="text-primary text-sm font-medium mt-0.5">Call Customer</p>
            </div>
            <span className="material-symbols-outlined text-slate-300 text-[20px]">
              chevron_right
            </span>
          </button>

          {item.ai_summary && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-blue-500 text-[18px]">
                  smart_toy
                </span>
                <p className="text-blue-700 font-semibold text-sm">AI Summary</p>
              </div>
              <p className="text-blue-800 text-sm leading-relaxed">{item.ai_summary}</p>
            </div>
          )}

          {item.revenue_display && (
            <div className="flex items-center gap-2 px-1">
              <span className="material-symbols-outlined text-emerald-500 text-[20px]">
                payments
              </span>
              <span className="text-slate-600 text-sm">Estimated Value:</span>
              <span className="font-bold text-emerald-600">{item.revenue_display}</span>
            </div>
          )}

          {item.notes && item.notes.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-amber-500 text-[18px]">
                  sticky_note_2
                </span>
                <p className="text-amber-700 font-semibold text-sm">Notes</p>
              </div>
              <div className="space-y-2">
                {item.notes.map((note) => (
                  <p key={note.id} className="text-amber-800 text-sm">
                    {note.note_text}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 p-4 bg-white border-t border-slate-100">
          <div className="flex gap-2">
            <button
              onClick={() => onBook(item)}
              className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white py-3 rounded-xl font-bold transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">calendar_add_on</span>
              Book
            </button>
            <button
              onClick={() => onSnooze(item)}
              className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">snooze</span>
              Snooze
            </button>
            <button
              onClick={() => onMarkLost(item)}
              className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-500 px-4 py-3 rounded-xl font-medium transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
