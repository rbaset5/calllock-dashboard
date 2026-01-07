'use client';

import { useState, useEffect, useCallback } from 'react';
import { NowCard } from '@/components/now/now-card';
import { DetailDrawer } from '@/components/now/detail-drawer';
import { OutcomePrompt } from '@/components/leads/outcome-prompt';
import { BookJobModal } from '@/components/leads/book-job-modal';
import type { NowItem, NowResponse } from '@/app/api/velocity/route';
import type { Lead, CallbackOutcome } from '@/types/database';
import Link from 'next/link';

type SnoozeOption = { label: string; value: number | string };

const SNOOZE_OPTIONS: SnoozeOption[] = [
  { label: '1 hour', value: 1 },
  { label: '3 hours', value: 3 },
  { label: 'Tomorrow AM', value: 'tomorrow_am' },
  { label: 'Tomorrow PM', value: 'tomorrow_pm' },
];

function getSnoozeTime(value: number | string): string {
  if (typeof value === 'number') {
    return new Date(Date.now() + value * 60 * 60 * 1000).toISOString();
  }
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (value === 'tomorrow_am') {
    tomorrow.setHours(9, 0, 0, 0);
  } else {
    tomorrow.setHours(14, 0, 0, 0);
  }
  return tomorrow.toISOString();
}

export default function NowPage() {
  const [items, setItems] = useState<NowItem[]>([]);
  const [counts, setCounts] = useState<NowResponse['counts'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextAppointment, setNextAppointment] = useState<{ time: string; name: string } | null>(null);

  const [selectedItem, setSelectedItem] = useState<NowItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [showSnoozeOptions, setShowSnoozeOptions] = useState(false);
  const [snoozeItem, setSnoozeItem] = useState<NowItem | null>(null);

  const [pendingOutcome, setPendingOutcome] = useState<NowItem | null>(null);
  const [showOutcomePrompt, setShowOutcomePrompt] = useState(false);

  const [bookingItem, setBookingItem] = useState<NowItem | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [nowRes, scheduleRes] = await Promise.all([
        fetch('/api/velocity'),
        fetch('/api/booked?limit=1'),
      ]);

      if (!nowRes.ok) throw new Error('Failed to fetch');

      const nowData: NowResponse = await nowRes.json();
      setItems(nowData.items || []);
      setCounts(nowData.counts);

      if (nowData.pendingOutcome) {
        setPendingOutcome(nowData.pendingOutcome);
        setShowOutcomePrompt(true);
      }

      if (scheduleRes.ok) {
        const scheduleData = await scheduleRes.json();
        const firstJob = scheduleData.groups?.[0]?.jobs?.[0];
        if (firstJob) {
          const time = new Date(firstJob.scheduled_at).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          });
          setNextAppointment({
            time: `${scheduleData.groups[0].label} ${time}`,
            name: `${firstJob.customer_name} - ${firstJob.ai_summary?.split('.')[0] || 'Service call'}`,
          });
        }
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Unable to load callbacks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleCall = async (phone: string, itemId?: string) => {
    if (itemId) {
      try {
        await fetch(`/api/leads/${itemId}/track-call`, { method: 'POST' });
      } catch (err) {
        console.error('Failed to track call:', err);
      }
    }
    window.location.href = `tel:${phone}`;
  };

  const handleCardTap = (item: NowItem) => {
    setSelectedItem(item);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => setSelectedItem(null), 300);
  };

  const handleNavigate = (address: string) => {
    const encoded = encodeURIComponent(address);
    window.open(`https://maps.google.com/maps?daddr=${encoded}`, '_blank');
  };

  const handleBook = (item: NowItem) => {
    setDrawerOpen(false);
    setBookingItem(item);
  };

  const handleSnooze = (item: NowItem) => {
    setDrawerOpen(false);
    setSnoozeItem(item);
    setShowSnoozeOptions(true);
  };

  const handleSnoozeSelect = async (value: number | string) => {
    if (!snoozeItem) return;

    const snoozeUntil = getSnoozeTime(value);

    try {
      await fetch(`/api/leads/${snoozeItem.id}/outcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome: 'try_again', snooze_until: snoozeUntil }),
      });

      setItems((prev) => prev.filter((i) => i.id !== snoozeItem.id));
    } catch (err) {
      console.error('Failed to snooze:', err);
    } finally {
      setShowSnoozeOptions(false);
      setSnoozeItem(null);
    }
  };

  const handleMarkLost = async (item: NowItem | string) => {
    const itemId = typeof item === 'string' ? item : item.id;
    setDrawerOpen(false);

    try {
      await fetch(`/api/leads/${itemId}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lost_reason: 'No response' }),
      });

      setItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (err) {
      console.error('Failed to mark lost:', err);
    }
  };

  const handleOutcome = async (outcome: CallbackOutcome, note?: string, snoozeUntil?: string) => {
    if (!pendingOutcome) return;

    try {
      await fetch(`/api/leads/${pendingOutcome.id}/outcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome, note, snooze_until: snoozeUntil }),
      });

      if (outcome === 'resolved' || outcome === 'booked') {
        setItems((prev) => prev.filter((i) => i.id !== pendingOutcome.id));
      }

      fetchData();
    } catch (err) {
      console.error('Failed to record outcome:', err);
    }
  };

  const handleOutcomeBook = () => {
    if (pendingOutcome) {
      setShowOutcomePrompt(false);
      setBookingItem(pendingOutcome);
    }
  };

  const handleBookingClose = () => {
    setBookingItem(null);
    fetchData();
  };

  if (loading) {
    return (
      <main className="flex flex-col max-w-lg mx-auto w-full px-4 pt-4 gap-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-32" />
          <div className="h-40 bg-slate-200 rounded" />
          <div className="h-40 bg-slate-200 rounded" />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex flex-col max-w-lg mx-auto w-full px-4 pt-4 gap-6">
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-primary text-white rounded-lg font-medium"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col max-w-lg mx-auto w-full px-4 pt-4 gap-4 pb-8">
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-primary text-5xl">
              check_circle
            </span>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">All Clear!</h3>
          <p className="text-slate-500 text-sm max-w-[240px] mb-6">
            No callbacks need attention. Great job staying on top of things!
          </p>

          {nextAppointment && (
            <Link
              href="/schedule"
              className="flex flex-col items-center p-4 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition-colors"
            >
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1">
                Next Up
              </p>
              <p className="text-slate-900 font-bold">{nextAppointment.time}</p>
              <p className="text-slate-600 text-sm">{nextAppointment.name}</p>
              <span className="text-primary font-medium text-sm mt-2 flex items-center gap-1">
                View Schedule
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </span>
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((item) => (
            <NowCard
              key={item.id}
              item={item}
              onCall={(phone) => handleCall(phone, item.id)}
              onTap={handleCardTap}
              onMarkLost={item.urgencyTier === 'getting_cold' ? () => handleMarkLost(item.id) : undefined}
            />
          ))}
        </div>
      )}

      <DetailDrawer
        item={selectedItem}
        open={drawerOpen}
        onClose={handleCloseDrawer}
        onBook={handleBook}
        onSnooze={handleSnooze}
        onMarkLost={handleMarkLost}
        onCall={(phone) => handleCall(phone, selectedItem?.id)}
        onNavigate={handleNavigate}
      />

      {showSnoozeOptions && snoozeItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowSnoozeOptions(false)} />
          <div className="relative bg-white rounded-t-2xl w-full max-w-lg p-4 pb-8 space-y-4 animate-slide-up">
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto" />
            <h3 className="text-lg font-bold text-center">Snooze until...</h3>
            <div className="grid grid-cols-2 gap-3">
              {SNOOZE_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => handleSnoozeSelect(opt.value)}
                  className="py-3 px-4 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium text-slate-700 transition-colors"
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowSnoozeOptions(false)}
              className="w-full py-3 text-slate-400 font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {pendingOutcome && (
        <OutcomePrompt
          lead={pendingOutcome as unknown as Lead}
          open={showOutcomePrompt}
          onClose={() => setShowOutcomePrompt(false)}
          onOutcome={handleOutcome}
          onBook={handleOutcomeBook}
        />
      )}

      {bookingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={handleBookingClose} />
          <div className="relative bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <BookJobModal
              lead={bookingItem as unknown as Lead}
              onClose={handleBookingClose}
              onSuccess={handleBookingClose}
            />
          </div>
        </div>
      )}
    </main>
  );
}
