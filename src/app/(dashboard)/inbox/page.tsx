'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RefreshCw, CheckCircle, Phone, Calendar, Clock, AlertTriangle, ChevronRight } from 'lucide-react';
import { Lead } from '@/types/database';
import { Button } from '@/components/ui/button';
import { BookJobModal } from '@/components/leads';
import { cn } from '@/lib/utils';
import { InboxItem, InboxResponse } from '@/app/api/inbox/route';

type FilterType = 'all' | 'stale' | 'callbacks' | 'quotes' | 'alerts';

const filters: { label: string; type: FilterType; countKey: keyof InboxResponse['counts'] }[] = [
  { label: 'All', type: 'all', countKey: 'total' },
  { label: 'Stale', type: 'stale', countKey: 'stale' },
  { label: 'Callbacks', type: 'callbacks', countKey: 'callbacks' },
  { label: 'Quotes', type: 'quotes', countKey: 'quotes' },
  { label: 'Alerts', type: 'alerts', countKey: 'alerts' },
];

function formatAgeDays(days: number): string {
  if (days === 0) return 'Today';
  if (days === 1) return '1d ago';
  return `${days}d ago`;
}

function InboxItemCard({
  item,
  onCall,
  onBook,
  onSnooze,
  onViewDetails,
}: {
  item: InboxItem;
  onCall: () => void;
  onBook: () => void;
  onSnooze: () => void;
  onDismiss: () => void;
  onViewDetails: () => void;
}) {
  const isLead = item.type === 'lead';

  // Status strip color (left border) - V3 Triage-aware
  const getStatusColor = (): string => {
    // Use V3 status_color if available
    if (item.status_color === 'red') return 'border-l-error-500';
    if (item.status_color === 'green') return 'border-l-success-500';
    if (item.status_color === 'yellow') return 'border-l-gold-500';
    // Fallback: callback complaints = red
    if (item.is_callback_complaint) return 'border-l-error-500';
    // Commercial = green (money)
    if (item.caller_type === 'commercial') return 'border-l-success-500';
    // Legacy fallbacks
    if (item.status === 'callback_requested' || item.urgency === 'high') return 'border-l-error-500';
    if (item.estimated_value) return 'border-l-success-500';
    // Default = blue
    return 'border-l-navy-500';
  };

  // Request type label (header) - V3 Triage hierarchy
  const getRequestLabel = (): string => {
    // TIER 1: Critical Flags (RED)
    if (item.is_callback_complaint) return 'CALLBACK RISK';
    if (item.caller_type === 'commercial') return 'COMMERCIAL';
    // TIER 2: Intents
    if (item.primary_intent === 'active_job_issue') return 'JOB ISSUE';
    if (item.primary_intent === 'solicitation') return 'SPAM/VENDOR';
    // TIER 3: Value (GREEN)
    if (item.estimated_value && item.estimated_value > 0) return 'OPEN QUOTE';
    // Legacy status fallbacks
    if (item.status === 'callback_requested') return 'CALLBACK';
    if (item.status === 'voicemail_left') return 'VOICEMAIL';
    if (item.type === 'alert') return item.alert_type === 'emergency' ? 'EMERGENCY' : 'SMS ALERT';
    return 'NEW LEAD';
  };

  // Header text color (matches status strip) - V3 Triage-aware
  const getHeaderColor = (): string => {
    // V3 status_color takes precedence
    if (item.status_color === 'red' || item.is_callback_complaint) return 'text-error-600';
    if (item.status_color === 'green' || item.caller_type === 'commercial') return 'text-success-600';
    if (item.status_color === 'yellow') return 'text-gold-600';
    // Legacy fallbacks
    if (item.estimated_value) return 'text-success-600';
    if (item.status === 'callback_requested' || item.urgency === 'high') return 'text-error-600';
    return 'text-navy-500';
  };

  // Format age with hours/minutes precision for urgency
  const formatAge = (): string => {
    const created = new Date(item.created_at);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays === 1) return '1d ago';
    return `${diffDays}d ago`;
  };

  return (
    <div
      className={cn(
        'bg-white rounded-r-xl rounded-l-sm border shadow-sm transition-all duration-200',
        'border-l-4',
        getStatusColor(),
        item.is_stale && 'ring-1 ring-gold-200'
      )}
    >
      {/* Stale Warning Banner */}
      {item.is_stale && (
        <div className="px-4 py-1.5 bg-gold-100 border-b border-gold-200 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-gold-600" />
          <span className="text-xs font-medium text-gold-800">
            {item.age_days}+ days old
          </span>
        </div>
      )}

      {/* Card Content */}
      <div className="p-3">
        {/* Header: Type + Age */}
        <div className="flex items-center justify-between mb-2">
          <span className={cn('text-xs font-bold tracking-wide', getHeaderColor())}>
            {getRequestLabel()}
          </span>
          <span className="text-xs text-navy-400">{formatAge()}</span>
        </div>

        {/* Name */}
        <h3 className="font-semibold text-navy-800 truncate">{item.customer_name}</h3>

        {/* Issue (no gray box) */}
        {item.description && (
          <p className="text-sm text-navy-500 line-clamp-2 mt-1">
            &ldquo;{item.description}&rdquo;
          </p>
        )}

        {/* Value */}
        {item.estimated_value && (
          <p className="text-sm font-bold text-gold-600 mt-2">
            ${item.estimated_value.toLocaleString()} Potential
          </p>
        )}
      </div>

      {/* Action Bar (compact - icons only) */}
      <div className="flex border-t border-navy-200 divide-x divide-navy-200">
        <button
          onClick={onCall}
          className="flex-1 py-2 min-h-[40px] text-navy-600 hover:bg-navy-50 flex items-center justify-center transition-colors"
          aria-label={`Call ${item.customer_name}`}
        >
          <Phone className="w-4 h-4" />
        </button>
        {isLead && (
          <button
            onClick={onBook}
            className="flex-1 py-2 min-h-[40px] text-navy-600 hover:bg-navy-50 flex items-center justify-center transition-colors"
            aria-label={`Book job for ${item.customer_name}`}
          >
            <Calendar className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={onSnooze}
          className="flex-1 py-2 min-h-[40px] text-navy-600 hover:bg-navy-50 flex items-center justify-center transition-colors"
          aria-label={`Snooze ${item.customer_name}`}
        >
          <Clock className="w-4 h-4" />
        </button>
        <button
          onClick={onViewDetails}
          className="py-2 px-3 min-h-[40px] text-navy-300 hover:bg-navy-50 hover:text-navy-600 flex items-center justify-center transition-colors"
          aria-label={`View details for ${item.customer_name}`}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default function InboxPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<InboxResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [bookingLead, setBookingLead] = useState<Lead | null>(null);
  const [snoozeItem, setSnoozeItem] = useState<InboxItem | null>(null);

  const fetchData = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);

      const response = await fetch(`/api/inbox?filter=${selectedFilter}`);
      if (!response.ok) throw new Error('Failed to fetch data');

      const inboxData: InboxResponse = await response.json();
      setData(inboxData);
    } catch (error) {
      console.error('Error fetching inbox:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle URL params for booking modal
  useEffect(() => {
    const leadId = searchParams.get('lead');
    const action = searchParams.get('action');

    if (leadId && action === 'book') {
      const fetchLead = async () => {
        try {
          const response = await fetch(`/api/leads/${leadId}`);
          if (response.ok) {
            const lead = await response.json();
            setBookingLead(lead);
          } else {
            router.replace('/inbox');
          }
        } catch (error) {
          console.error('Error fetching lead:', error);
          router.replace('/inbox');
        }
      };
      fetchLead();
    }
  }, [searchParams, router]);

  const handleCall = (item: InboxItem) => {
    if (item.customer_phone) {
      window.location.href = `tel:${item.customer_phone}`;
    }
  };

  const handleBook = (item: InboxItem) => {
    if (item.type === 'lead' && item.lead) {
      setBookingLead(item.lead);
    }
  };

  const handleSnooze = (item: InboxItem) => {
    setSnoozeItem(item);
  };

  const handleDismiss = async (item: InboxItem) => {
    if (item.type === 'lead' && item.lead) {
      try {
        await fetch(`/api/leads/${item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'lost' }),
        });
        fetchData();
      } catch (error) {
        console.error('Error dismissing item:', error);
      }
    }
  };

  const handleViewDetails = (item: InboxItem) => {
    if (item.type === 'lead') {
      router.push(`/leads/${item.id}?from=/inbox`);
    }
  };

  const handleSetReminder = async (remindAt: string) => {
    if (!snoozeItem || snoozeItem.type !== 'lead') return;

    try {
      await fetch(`/api/leads/${snoozeItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remind_at: remindAt }),
      });
      fetchData();
      setSnoozeItem(null);
    } catch (error) {
      console.error('Error setting reminder:', error);
    }
  };

  const handleCloseBookingModal = () => {
    setBookingLead(null);
    router.replace('/inbox');
  };

  const handleJobBooked = (jobId: string) => {
    setBookingLead(null);
    fetchData();
    router.push(`/jobs/${jobId}`);
  };

  if (loading) {
    return (
      <div className="cl-page-container">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-navy-100 rounded w-32" />
          <div className="h-10 bg-navy-100 rounded" />
          <div className="h-32 bg-navy-100 rounded" />
          <div className="h-32 bg-navy-100 rounded" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const hasItems = data.items.length > 0;
  const staleCount = data.counts.stale;

  return (
    <div className="cl-page-container space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="cl-heading-page">Inbox</h1>
          <p className="text-sm text-navy-400">
            {data.counts.total} item{data.counts.total !== 1 ? 's' : ''} needing attention
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchData(true)}
          disabled={refreshing}
          aria-label="Refresh inbox"
        >
          <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
        </Button>
      </div>

      {/* Stale Items Alert Banner */}
      {staleCount > 0 && selectedFilter !== 'stale' && (
        <button
          onClick={() => setSelectedFilter('stale')}
          className="w-full flex items-center justify-between p-3 bg-gold-50 border border-gold-200 rounded-lg hover:bg-gold-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-gold-600" />
            <span className="text-sm font-medium text-gold-800">
              {staleCount} stale item{staleCount !== 1 ? 's' : ''} (3+ days old)
            </span>
          </div>
          <ChevronRight className="w-5 h-5 text-gold-600" />
        </button>
      )}

      {/* Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {filters.map((filter) => {
          const isSelected = selectedFilter === filter.type;
          const count = data.counts[filter.countKey];
          const isStale = filter.type === 'stale';

          return (
            <button
              key={filter.type}
              onClick={() => setSelectedFilter(filter.type)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                isSelected
                  ? isStale
                    ? 'bg-gold-100 text-gold-800 border border-gold-300'
                    : 'bg-navy-100 text-navy-700 border border-navy-200'
                  : 'bg-navy-50 text-navy-500 hover:bg-navy-100'
              )}
            >
              {filter.label}
              {count > 0 && (
                <span className={cn(
                  'text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center',
                  isSelected
                    ? isStale
                      ? 'bg-gold-200 text-gold-900'
                      : 'bg-navy-200 text-navy-800'
                    : 'bg-navy-200 text-navy-600'
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Items List */}
      {hasItems ? (
        <div className="space-y-3">
          {/* Stale Section Header */}
          {data.stale.length > 0 && selectedFilter === 'all' && (
            <div className="flex items-center gap-2 pt-2">
              <AlertTriangle className="w-4 h-4 text-gold-600" />
              <h2 className="cl-heading-section text-gold-800">
                Stale ({data.stale.length})
              </h2>
            </div>
          )}

          {data.items.map((item) => (
            <InboxItemCard
              key={`${item.type}-${item.id}`}
              item={item}
              onCall={() => handleCall(item)}
              onBook={() => handleBook(item)}
              onSnooze={() => handleSnooze(item)}
              onDismiss={() => handleDismiss(item)}
              onViewDetails={() => handleViewDetails(item)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-navy-200 p-8 text-center">
          <CheckCircle className="w-12 h-12 text-success-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-navy-800 mb-2">
            All caught up!
          </h3>
          <p className="text-navy-400">
            {selectedFilter === 'all'
              ? 'No items need your attention right now'
              : `No ${filters.find(f => f.type === selectedFilter)?.label.toLowerCase()} items`}
          </p>
        </div>
      )}

      {/* Snooze Modal */}
      {snoozeItem && (
        <div className="fixed inset-0 bg-navy-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-semibold text-navy-800 mb-4">Snooze Reminder</h3>
            <p className="text-sm text-navy-500 mb-4">
              When would you like to be reminded about {snoozeItem.customer_name}?
            </p>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  tomorrow.setHours(9, 0, 0, 0);
                  handleSetReminder(tomorrow.toISOString());
                }}
              >
                Tomorrow morning
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  const nextWeek = new Date();
                  nextWeek.setDate(nextWeek.getDate() + 7);
                  nextWeek.setHours(9, 0, 0, 0);
                  handleSetReminder(nextWeek.toISOString());
                }}
              >
                Next week
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setSnoozeItem(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Book Job Modal */}
      {bookingLead && (
        <BookJobModal
          lead={bookingLead}
          onClose={handleCloseBookingModal}
          onBooked={handleJobBooked}
        />
      )}
    </div>
  );
}
