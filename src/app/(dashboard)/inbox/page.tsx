'use client';

/**
 * INBOX Page - Archive View
 *
 * Displays ALL items (leads, jobs, calls) with filtering tabs.
 * This is the "archive" complement to the ACTION page.
 *
 * Tabs: All | Booked | Missed | Spam
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  RefreshCw,
  CheckCircle,
  Phone,
  Calendar,
  Clock,
  AlertTriangle,
  ChevronRight,
  Inbox,
  CalendarCheck,
  PhoneMissed,
  Ban,
} from 'lucide-react';
import { Lead, Job, Call } from '@/types/database';
import { Button } from '@/components/ui/button';
import { BookJobModal } from '@/components/leads';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';

type FilterType = 'all' | 'booked' | 'missed' | 'spam';

interface InboxItem {
  id: string;
  type: 'lead' | 'job' | 'call';
  customer_name: string;
  customer_phone: string;
  description: string | null;
  created_at: string;
  // Lead-specific
  lead?: Lead;
  priority_color?: string;
  status?: string;
  // Job-specific
  job?: Job;
  scheduled_at?: string | null;
  is_ai_booked?: boolean;
  // Call-specific
  call?: Call;
  outcome?: string;
  duration_seconds?: number;
}

interface InboxData {
  items: InboxItem[];
  counts: {
    all: number;
    booked: number;
    missed: number;
    spam: number;
  };
}

const filters: { label: string; type: FilterType; icon: any }[] = [
  { label: 'All', type: 'all', icon: Inbox },
  { label: 'Booked', type: 'booked', icon: CalendarCheck },
  { label: 'Missed', type: 'missed', icon: PhoneMissed },
  { label: 'Spam', type: 'spam', icon: Ban },
];

function formatTime(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, 'h:mm a');
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d');
  } catch {
    return '';
  }
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function InboxItemCard({
  item,
  onCall,
  onBook,
  onViewDetails,
}: {
  item: InboxItem;
  onCall: () => void;
  onBook: () => void;
  onViewDetails: () => void;
}) {
  const isLead = item.type === 'lead';
  const isJob = item.type === 'job';
  const isCall = item.type === 'call';

  // Get type badge
  const getTypeBadge = () => {
    if (isJob) {
      return (
        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
          BOOKED
        </span>
      );
    }
    if (isCall) {
      const isMissed =
        item.outcome === 'customer_hangup' || item.outcome === 'abandoned';
      return (
        <span
          className={cn(
            'text-xs font-bold px-2 py-0.5 rounded',
            isMissed
              ? 'text-red-600 bg-red-50'
              : 'text-blue-600 bg-blue-50'
          )}
        >
          {isMissed ? 'MISSED' : 'CALL'}
        </span>
      );
    }
    if (isLead && item.priority_color === 'gray') {
      return (
        <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
          SPAM
        </span>
      );
    }
    return (
      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
        LEAD
      </span>
    );
  };

  // Get status color for left border
  const getBorderColor = () => {
    if (isJob) return 'border-l-emerald-500';
    if (isCall) {
      const isMissed =
        item.outcome === 'customer_hangup' || item.outcome === 'abandoned';
      return isMissed ? 'border-l-red-500' : 'border-l-blue-500';
    }
    if (item.priority_color === 'red') return 'border-l-red-500';
    if (item.priority_color === 'green') return 'border-l-emerald-500';
    if (item.priority_color === 'gray') return 'border-l-gray-300';
    return 'border-l-blue-500';
  };

  return (
    <div
      className={cn(
        'bg-white rounded-r-xl rounded-l-sm border shadow-sm transition-all duration-200',
        'border-l-4',
        getBorderColor()
      )}
    >
      <div className="p-3">
        {/* Header: Type + Time */}
        <div className="flex items-center justify-between mb-2">
          {getTypeBadge()}
          <span className="text-xs text-slate-400">
            {isJob && item.scheduled_at
              ? `Scheduled: ${formatTime(item.scheduled_at)}`
              : formatTime(item.created_at)}
          </span>
        </div>

        {/* Name */}
        <h3 className="font-semibold text-slate-800 truncate">
          {item.customer_name}
        </h3>

        {/* Description */}
        {item.description && (
          <p className="text-sm text-slate-500 line-clamp-2 mt-1">
            {item.description}
          </p>
        )}

        {/* Call duration */}
        {isCall && item.duration_seconds && (
          <p className="text-xs text-slate-400 mt-1">
            Duration: {formatDuration(item.duration_seconds)}
          </p>
        )}

        {/* AI Booked badge */}
        {isJob && item.is_ai_booked && (
          <span className="inline-flex items-center gap-1 text-xs text-amber-600 mt-2">
            <CalendarCheck className="w-3 h-3" />
            AI Booked
          </span>
        )}
      </div>

      {/* Action Bar */}
      <div className="flex border-t border-slate-100 divide-x divide-slate-100">
        <button
          onClick={onCall}
          className="flex-1 py-2 min-h-[40px] text-slate-600 hover:bg-slate-50 flex items-center justify-center transition-colors"
          aria-label={`Call ${item.customer_name}`}
        >
          <Phone className="w-4 h-4" />
        </button>
        {(isLead || isJob) && (
          <button
            onClick={onBook}
            className="flex-1 py-2 min-h-[40px] text-slate-600 hover:bg-slate-50 flex items-center justify-center transition-colors"
            aria-label={`Book for ${item.customer_name}`}
          >
            <Calendar className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={onViewDetails}
          className="py-2 px-3 min-h-[40px] text-slate-300 hover:bg-slate-50 hover:text-slate-600 flex items-center justify-center transition-colors"
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
  const [data, setData] = useState<InboxData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [bookingLead, setBookingLead] = useState<Lead | null>(null);

  const fetchData = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);

      // Fetch all data types in parallel
      const [leadsRes, jobsRes, callsRes] = await Promise.all([
        fetch('/api/inbox?filter=all'),
        fetch('/api/booked'),
        fetch('/api/calls?limit=50'),
      ]);

      const leadsData = leadsRes.ok ? await leadsRes.json() : { items: [] };
      const jobsData = jobsRes.ok ? await jobsRes.json() : { groups: [] };
      const callsData = callsRes.ok ? await callsRes.json() : { calls: [] };

      // Convert leads to inbox items
      const leadItems: InboxItem[] = (leadsData.items || []).map(
        (item: any) => ({
          id: item.id,
          type: 'lead' as const,
          customer_name: item.customer_name,
          customer_phone: item.customer_phone,
          description: item.description || item.issue_description,
          created_at: item.created_at,
          lead: item.lead,
          priority_color: item.priority_color,
          status: item.status,
        })
      );

      // Convert jobs to inbox items
      const jobItems: InboxItem[] = [];
      for (const group of jobsData.groups || []) {
        for (const job of group.jobs || []) {
          jobItems.push({
            id: job.id,
            type: 'job' as const,
            customer_name: job.customer_name,
            customer_phone: job.customer_phone,
            description: job.ai_summary || job.issue_description,
            created_at: job.created_at,
            job: job,
            scheduled_at: job.scheduled_at,
            is_ai_booked: job.is_ai_booked,
          });
        }
      }

      // Convert calls to inbox items
      const callItems: InboxItem[] = (callsData.calls || []).map(
        (call: Call) => ({
          id: call.id,
          type: 'call' as const,
          customer_name: call.customer_name || 'Unknown',
          customer_phone: call.phone_number,
          description: call.problem_description,
          created_at: call.started_at,
          call: call,
          outcome: call.outcome,
          duration_seconds: call.duration_seconds,
        })
      );

      // Combine all items
      const allItems = [...leadItems, ...jobItems, ...callItems];

      // Sort by created_at descending
      allItems.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Calculate counts
      const bookedCount = jobItems.length;
      const missedCount = callItems.filter(
        (c) =>
          c.outcome === 'customer_hangup' || c.outcome === 'abandoned'
      ).length;
      const spamCount = leadItems.filter(
        (l) => l.priority_color === 'gray'
      ).length;

      // Filter items based on selected filter
      let filteredItems = allItems;
      if (selectedFilter === 'booked') {
        filteredItems = jobItems;
      } else if (selectedFilter === 'missed') {
        filteredItems = callItems.filter(
          (c) =>
            c.outcome === 'customer_hangup' || c.outcome === 'abandoned'
        );
      } else if (selectedFilter === 'spam') {
        filteredItems = leadItems.filter((l) => l.priority_color === 'gray');
      }

      setData({
        items: filteredItems,
        counts: {
          all: allItems.length,
          booked: bookedCount,
          missed: missedCount,
          spam: spamCount,
        },
      });
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

  const handleViewDetails = (item: InboxItem) => {
    if (item.type === 'lead') {
      router.push(`/leads/${item.id}?from=/inbox`);
    } else if (item.type === 'job') {
      router.push(`/jobs/${item.id}?from=/inbox`);
    } else if (item.type === 'call') {
      router.push(`/calls/${item.id}?from=/inbox`);
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
          <div className="h-8 bg-slate-100 rounded w-32" />
          <div className="h-10 bg-slate-100 rounded" />
          <div className="h-32 bg-slate-100 rounded" />
          <div className="h-32 bg-slate-100 rounded" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const hasItems = data.items.length > 0;

  return (
    <div className="cl-page-container space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Inbox</h1>
          <p className="text-sm text-slate-500">
            {data.counts.all} total items
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchData(true)}
          disabled={refreshing}
          aria-label="Refresh inbox"
        >
          <RefreshCw
            className={cn('w-4 h-4', refreshing && 'animate-spin')}
          />
        </Button>
      </div>

      {/* Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {filters.map((filter) => {
          const isSelected = selectedFilter === filter.type;
          const count = data.counts[filter.type];
          const Icon = filter.icon;

          return (
            <button
              key={filter.type}
              onClick={() => setSelectedFilter(filter.type)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                isSelected
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {filter.label}
              {count > 0 && (
                <span
                  className={cn(
                    'text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center',
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 text-slate-600'
                  )}
                >
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
          {data.items.map((item) => (
            <InboxItemCard
              key={`${item.type}-${item.id}`}
              item={item}
              onCall={() => handleCall(item)}
              onBook={() => handleBook(item)}
              onViewDetails={() => handleViewDetails(item)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">
            {selectedFilter === 'all'
              ? 'Inbox is empty'
              : `No ${selectedFilter} items`}
          </h3>
          <p className="text-slate-400">
            {selectedFilter === 'all'
              ? 'No items to display'
              : `No ${filters.find((f) => f.type === selectedFilter)?.label.toLowerCase()} items found`}
          </p>
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
