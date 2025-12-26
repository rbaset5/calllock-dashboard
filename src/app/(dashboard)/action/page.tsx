'use client';

/**
 * ACTION Page - Velocity Triage System
 *
 * Displays leads and jobs sorted by velocity score.
 * Uses VelocityCardFactory to render specialized cards based on archetype.
 */

import { useState, useEffect, useCallback } from 'react';
import { Lead, Job, VelocityArchetype, CallbackOutcome } from '@/types/database';
import { VelocityResponse, VelocityItemWithType } from '@/app/api/velocity/route';
import { VelocityCardFactory } from '@/components/velocity';
import { getEmptyStateForFilter } from '@/components/velocity/empty-states';
import { BookJobModal } from '@/components/leads/book-job-modal';
import type { SnoozeDuration } from '@/components/velocity/types';
import { AddNoteModal } from '@/components/leads/add-note-modal';
import { OutcomePrompt } from '@/components/leads/outcome-prompt';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle, DollarSign, PhoneCall, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { determineArchetype, ARCHETYPE_CONFIG } from '@/lib/velocity';

// Archetype filter options
const ARCHETYPE_FILTERS: { value: VelocityArchetype | 'all'; label: string; icon: any }[] = [
  { value: 'all', label: 'All', icon: null },
  { value: 'HAZARD', label: 'Hazard', icon: AlertTriangle },
  { value: 'RECOVERY', label: 'Recovery', icon: PhoneCall },
  { value: 'REVENUE', label: 'Revenue', icon: DollarSign },
  { value: 'LOGISTICS', label: 'Logistics', icon: ClipboardList },
];

export default function ActionPage() {
  const [data, setData] = useState<VelocityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<VelocityArchetype | 'all'>('all');

  // AI stats for empty state
  const [todayStats, setTodayStats] = useState({ total_calls: 0, ai_booked: 0 });

  // Modal state
  const [bookModalItem, setBookModalItem] = useState<VelocityItemWithType | null>(null);
  const [pendingOutcomeItem, setPendingOutcomeItem] = useState<VelocityItemWithType | null>(null);
  const [addNoteItem, setAddNoteItem] = useState<VelocityItemWithType | null>(null);

  const fetchData = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);

      const params = new URLSearchParams();
      if (activeFilter !== 'all') {
        params.set('archetype', activeFilter);
      }

      // Fetch velocity data and stats in parallel
      const [velocityResponse, statsResponse] = await Promise.all([
        fetch(`/api/velocity?${params.toString()}`),
        fetch('/api/stats/today'),
      ]);

      if (!velocityResponse.ok) {
        throw new Error('Failed to fetch action items');
      }

      const result: VelocityResponse = await velocityResponse.json();
      setData(result);

      // Load stats for empty state
      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        setTodayStats(stats);
      }

      // Check for pending outcome
      if (result.pendingOutcome) {
        setPendingOutcomeItem(result.pendingOutcome);
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching action items:', err);
      setError('Unable to load action items');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    fetchData();

    // Refresh every 30 seconds
    const interval = setInterval(() => fetchData(), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Handle call tap - track it for outcome prompt
  const handleCall = async (phone: string, item: VelocityItemWithType) => {
    try {
      if (item.itemType === 'lead') {
        await fetch(`/api/leads/${item.id}/track-call`, { method: 'POST' });
      }
      window.location.href = `tel:${phone}`;
    } catch (err) {
      console.error('Error tracking call:', err);
      window.location.href = `tel:${phone}`;
    }
  };

  // Handle booking - open book modal
  const handleBook = (item: VelocityItemWithType) => {
    setBookModalItem(item);
  };

  // Handle archive
  const handleArchive = async (item: VelocityItemWithType) => {
    try {
      if (item.itemType === 'lead') {
        await fetch(`/api/leads/${item.id}/archive`, { method: 'POST' });
      }
      fetchData(true);
    } catch (err) {
      console.error('Error archiving:', err);
    }
  };

  // Handle add note
  const handleAddNote = (item: VelocityItemWithType) => {
    setAddNoteItem(item);
  };

  const handleNoteSuccess = () => {
    setAddNoteItem(null);
    fetchData(true);
  };

  // Handle snooze
  const handleSnooze = async (item: VelocityItemWithType, duration: SnoozeDuration) => {
    if (item.itemType !== 'lead') return;

    try {
      // Calculate snooze time
      const now = new Date();
      let snoozeUntil: Date;

      switch (duration) {
        case '1h':
          snoozeUntil = new Date(now.getTime() + 60 * 60 * 1000);
          break;
        case '3h':
          snoozeUntil = new Date(now.getTime() + 3 * 60 * 60 * 1000);
          break;
        case 'tomorrow':
          snoozeUntil = new Date(now);
          snoozeUntil.setDate(snoozeUntil.getDate() + 1);
          snoozeUntil.setHours(9, 0, 0, 0);
          break;
      }

      await fetch(`/api/leads/${item.id}/snooze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remind_at: snoozeUntil.toISOString() }),
      });

      fetchData(true);
    } catch (err) {
      console.error('Error snoozing lead:', err);
    }
  };

  // Handle mark lost
  const handleMarkLost = async (item: VelocityItemWithType) => {
    if (item.itemType !== 'lead') return;

    try {
      await fetch(`/api/leads/${item.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'lost' }),
      });

      fetchData(true);
    } catch (err) {
      console.error('Error marking lead as lost:', err);
    }
  };

  // Handle booking success
  const handleBookingSuccess = () => {
    setBookModalItem(null);
    fetchData(true);
  };

  // Handle outcome submission
  const handleOutcome = async (
    outcome: CallbackOutcome,
    note?: string,
    snoozeUntil?: string
  ) => {
    if (!pendingOutcomeItem || pendingOutcomeItem.itemType !== 'lead') return;

    const response = await fetch(`/api/leads/${pendingOutcomeItem.id}/outcome`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outcome,
        note,
        snooze_until: snoozeUntil,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to submit outcome');
    }

    setPendingOutcomeItem(null);
    fetchData(true);
  };

  // Handle outcome -> book flow
  const handleOutcomeBook = (lead: Lead) => {
    setPendingOutcomeItem(null);
    setBookModalItem({ ...lead, itemType: 'lead' });
  };

  const items = data?.items || [];
  const counts = data?.counts || { HAZARD: 0, RECOVERY: 0, REVENUE: 0, LOGISTICS: 0 };
  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);

  if (loading) {
    return (
      <div className="cl-page-container">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-navy-100 rounded w-32" />
          <div className="h-12 bg-navy-100 rounded" />
          <div className="h-40 bg-navy-100 rounded" />
          <div className="h-40 bg-navy-100 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cl-page-container">
        <div className="text-center py-12">
          <p className="text-error-600 mb-4">{error}</p>
          <Button onClick={() => fetchData()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="cl-page-container pb-24">
      {/* Header with counts */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Action</h1>
            <p className="text-sm text-slate-500">
              {totalCount} item{totalCount !== 1 ? 's' : ''} need attention
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="text-slate-500"
          >
            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
          </Button>
        </div>

        {/* Archetype Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:justify-center">
          {ARCHETYPE_FILTERS.map((filter) => {
            const count = filter.value === 'all' ? totalCount : counts[filter.value];
            const isActive = activeFilter === filter.value;
            const config = filter.value !== 'all' ? ARCHETYPE_CONFIG[filter.value] : null;

            return (
              <button
                key={filter.value}
                onClick={() => setActiveFilter(filter.value)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                  isActive
                    ? filter.value === 'all'
                      ? 'bg-slate-900 text-white'
                      : `${config?.bgColor} ${config?.color} border ${config?.borderColor}`
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {filter.icon && <filter.icon className="h-3.5 w-3.5" />}
                {filter.label}
                {count > 0 && (
                  <span
                    className={cn(
                      'ml-1 px-1.5 py-0.5 rounded-full text-xs',
                      isActive ? 'bg-white/20 text-current' : 'bg-slate-200 text-slate-600'
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Velocity Cards */}
      {items.length === 0 ? (
        getEmptyStateForFilter(activeFilter, todayStats)
      ) : (
        <div className="space-y-10">
          {items.map((item) => (
            <VelocityCardFactory
              key={item.id}
              data={item}
              onCall={(phone) => handleCall(phone, item)}
              onDispatch={() => handleCall(item.customer_phone, item)}
              onBook={() => handleBook(item)}
              onArchive={() => handleArchive(item)}
              onAddNote={() => handleAddNote(item)}
              onSnooze={(_, duration) => handleSnooze(item, duration)}
              onMarkLost={() => handleMarkLost(item)}
              onPlay={() => {
                // TODO: Open call player modal
                console.log('Play call for', item.id);
              }}
              onNavigate={(address) => {
                window.open(
                  `https://maps.google.com/maps?q=${encodeURIComponent(address)}`,
                  '_blank'
                );
              }}
            />
          ))}
        </div>
      )}

      {/* Book Job Modal */}
      {bookModalItem && bookModalItem.itemType === 'lead' && (
        <BookJobModal
          lead={bookModalItem as Lead}
          onClose={() => setBookModalItem(null)}
          onSuccess={handleBookingSuccess}
        />
      )}

      {/* Outcome Prompt Modal */}
      {pendingOutcomeItem && pendingOutcomeItem.itemType === 'lead' && (
        <OutcomePrompt
          lead={pendingOutcomeItem as Lead}
          open={!!pendingOutcomeItem}
          onClose={() => setPendingOutcomeItem(null)}
          onOutcome={handleOutcome}
          onBook={handleOutcomeBook}
        />
      )}

      {/* Add Note Modal */}
      {addNoteItem && addNoteItem.itemType === 'lead' && (
        <AddNoteModal
          lead={addNoteItem as Lead}
          onClose={() => setAddNoteItem(null)}
          onSuccess={handleNoteSuccess}
        />
      )}
    </div>
  );
}
