'use client';

import { useState, useEffect, useCallback } from 'react';
import { Lead, PriorityColor } from '@/types/database';
import { ActionResponse } from '@/app/api/action/route';
import { LeadCardV4, ActionEmptyState, OutcomePrompt, ActionTimeline } from '@/components/leads';
import { BookJobModal } from '@/components/leads/book-job-modal';
import { AddNoteModal } from '@/components/leads/add-note-modal';
import { CallbackOutcome } from '@/types/database';
import { Button } from '@/components/ui/button';
import { PageTabs } from '@/components/ui/page-tabs';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// Priority filter tabs
const PRIORITY_FILTERS: { value: PriorityColor | 'all'; label: string; color: string }[] = [
  { value: 'all', label: 'All', color: 'bg-gray-100 text-gray-700' },
  { value: 'red', label: 'Callback Risk', color: 'bg-red-100 text-red-700' },
  { value: 'green', label: 'Commercial', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'blue', label: 'New Leads', color: 'bg-blue-100 text-blue-700' },
  { value: 'gray', label: 'Spam', color: 'bg-gray-100 text-gray-500' },
];

export default function ActionPage() {
  const [data, setData] = useState<ActionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<PriorityColor | 'all'>('all');

  // AI stats for empty state
  const [todayStats, setTodayStats] = useState({ total_calls: 0, ai_booked: 0 });

  // Modal state
  const [bookModalLead, setBookModalLead] = useState<Lead | null>(null);
  const [pendingOutcomeLead, setPendingOutcomeLead] = useState<Lead | null>(null);
  const [addNoteLead, setAddNoteLead] = useState<Lead | null>(null);

  const fetchData = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);

      const params = new URLSearchParams();
      if (activeFilter !== 'all') {
        params.set('priority_color', activeFilter);
      }

      // Fetch action data and stats in parallel
      const [actionResponse, statsResponse] = await Promise.all([
        fetch(`/api/action?${params.toString()}`),
        fetch('/api/stats/today'),
      ]);

      if (!actionResponse.ok) {
        throw new Error('Failed to fetch action items');
      }

      const result: ActionResponse = await actionResponse.json();
      setData(result);

      // Load stats for empty state
      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        setTodayStats(stats);
      }

      // Check for pending outcome (lead with recent call tap)
      if (result.pendingOutcome) {
        setPendingOutcomeLead(result.pendingOutcome);
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
  const handleCall = async (lead: Lead) => {
    try {
      // Track the call tap in the database
      await fetch(`/api/leads/${lead.id}/track-call`, {
        method: 'POST',
      });

      // Open native dialer
      window.location.href = `tel:${lead.customer_phone}`;
    } catch (err) {
      console.error('Error tracking call:', err);
      // Still open dialer even if tracking fails
      window.location.href = `tel:${lead.customer_phone}`;
    }
  };

  // Handle booking - open book modal
  const handleBook = (lead: Lead) => {
    setBookModalLead(lead);
  };

  // Handle archive
  const handleArchive = async (lead: Lead) => {
    try {
      await fetch(`/api/leads/${lead.id}/archive`, { method: 'POST' });
      fetchData(true);
    } catch (err) {
      console.error('Error archiving lead:', err);
    }
  };

  // Handle add note - open modal
  const handleAddNote = (lead: Lead) => {
    setAddNoteLead(lead);
  };

  const handleNoteSuccess = () => {
    // Optionally show a toast here
    setAddNoteLead(null);
  };

  // Handle mark spam
  const handleMarkSpam = async (lead: Lead) => {
    try {
      await fetch(`/api/leads/${lead.id}/spam`, { method: 'POST' });
      fetchData(true);
    } catch (err) {
      console.error('Error marking lead as spam:', err);
    }
  };

  // Handle booking success
  const handleBookingSuccess = () => {
    setBookModalLead(null);
    fetchData(true); // Refresh to remove booked lead
  };

  // Handle outcome submission
  const handleOutcome = async (
    outcome: CallbackOutcome,
    note?: string,
    snoozeUntil?: string
  ) => {
    if (!pendingOutcomeLead) return;

    const response = await fetch(`/api/leads/${pendingOutcomeLead.id}/outcome`, {
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

    setPendingOutcomeLead(null);
    fetchData(true); // Refresh list
  };

  // Handle outcome -> book flow
  const handleOutcomeBook = (lead: Lead) => {
    setPendingOutcomeLead(null);
    setBookModalLead(lead);
  };

  // Filter leads by priority color
  const filteredLeads = data?.leads || [];

  // Get counts for filter badges
  const counts = data?.counts || { total: 0, red: 0, green: 0, blue: 0, gray: 0 };
  const bookedCount = data?.bookedCount || 0;

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
    <div className="cl-page-container">
      {/* Header - PRD layout */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-navy-800">Action</h1>
          <span className="text-lg text-navy-400">({counts.total})</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            aria-label="Refresh"
          >
            <RefreshCw className={cn('w-5 h-5', refreshing && 'animate-spin')} />
          </Button>
          <Link href="/history">
            <Button variant="ghost" size="icon" aria-label="History">
              <Clock className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* In-page tab bar - ACTION/BOOKED */}
      <PageTabs
        activeTab="action"
        actionCount={counts.total}
        bookedCount={bookedCount}
      />

      {/* Priority Filter Pills - Always visible per PRD */}
      <div className="mb-4 overflow-x-auto pb-2 -mx-4 px-4">
        <div className="w-full max-w-lg mx-auto flex items-center justify-between gap-2">
          {PRIORITY_FILTERS.map((filter) => {
            const count = filter.value === 'all'
              ? counts.total
              : counts[filter.value as PriorityColor];

            const isActive = activeFilter === filter.value;

            return (
              <Button
                key={filter.value}
                variant={isActive ? "default" : "outline"}
                className={cn(
                  "flex-1 h-auto py-2 px-3 flex flex-col gap-1 items-center justify-center rounded-xl border transition-all",
                  isActive
                    ? "border-navy-900 bg-navy-50 text-navy-900 hover:bg-navy-100 shadow-sm"
                    : "border-gray-200 text-gray-600 hover:bg-slate-50 hover:text-navy-700"
                )}
                onClick={() => setActiveFilter(filter.value as PriorityColor | 'all')}
              >
                <span className={cn(
                  "flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold transition-colors",
                  isActive ? "bg-navy-900 text-white" : "bg-gray-200 text-gray-600 group-hover:bg-gray-300"
                )}>
                  {count}
                </span>
                <span className="text-xs font-medium">{filter.label}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Active filter clear button */}
      {activeFilter !== 'all' && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-gray-500">Filtered by:</span>
          <button
            onClick={() => setActiveFilter('all')}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
              PRIORITY_FILTERS.find((f) => f.value === activeFilter)?.color
            )}
          >
            {PRIORITY_FILTERS.find((f) => f.value === activeFilter)?.label}
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Lead Cards */}
      {filteredLeads.length === 0 ? (
        <ActionEmptyState
          totalCalls={todayStats.total_calls}
          aiBooked={todayStats.ai_booked}
        />
      ) : (
        <ActionTimeline
          leads={filteredLeads}
          onCall={handleCall}
          onBook={handleBook}
          onArchive={handleArchive}
          onAddNote={handleAddNote}
          onMarkSpam={handleMarkSpam}
          hidePriorityBadge={activeFilter !== 'all'}
        />
      )}

      {/* Book Job Modal */}
      {bookModalLead && (
        <BookJobModal
          lead={bookModalLead}
          onClose={() => setBookModalLead(null)}
          onSuccess={handleBookingSuccess}
        />
      )}

      {/* Outcome Prompt Modal */}
      {pendingOutcomeLead && (
        <OutcomePrompt
          lead={pendingOutcomeLead}
          open={!!pendingOutcomeLead}
          onClose={() => setPendingOutcomeLead(null)}
          onOutcome={handleOutcome}
          onBook={handleOutcomeBook}
        />
      )}

      {/* Add Note Modal */}
      {addNoteLead && (
        <AddNoteModal
          lead={addNoteLead}
          onClose={() => setAddNoteLead(null)}
          onSuccess={handleNoteSuccess}
        />
      )}
    </div>
  );
}
