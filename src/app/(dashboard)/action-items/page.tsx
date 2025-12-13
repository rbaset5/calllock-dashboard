'use client';

import { useState, useEffect, useCallback } from 'react';
import { Lead } from '@/types/database';
import { ActionItem, ActionItemType } from '@/app/api/today/route';
import { LeadCard, RemindMeModal, BookJobModal } from '@/components/leads';
import { ActionItemCard } from '@/components/today/action-item-card';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter, useSearchParams } from 'next/navigation';

// Filter type for the 4 action item categories
type FilterType = 'all' | 'missed_calls' | 'pending_quotes' | 'callbacks' | 'follow_ups';

interface ActionItemsData {
  actionItems: ActionItem[];
  counts: {
    total: number;
    missed_calls: number;
    pending_quotes: number;
    callbacks: number;
    follow_ups: number;
  };
}

const filters: { label: string; type: FilterType }[] = [
  { label: 'All', type: 'all' },
  { label: 'Missed Calls', type: 'missed_calls' },
  { label: 'Pending Quotes', type: 'pending_quotes' },
  { label: 'Callbacks', type: 'callbacks' },
  { label: 'Follow-Ups', type: 'follow_ups' },
];

export default function ActionItemsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<ActionItemsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [remindModalItem, setRemindModalItem] = useState<ActionItem | null>(null);
  const [bookingLead, setBookingLead] = useState<Lead | null>(null);
  const [loadingLead, setLoadingLead] = useState(false);

  const fetchData = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);

      const response = await fetch('/api/today');
      if (!response.ok) throw new Error('Failed to fetch data');

      const todayData = await response.json();
      const items: ActionItem[] = todayData.actionItems || [];

      // Calculate counts by type
      const missedCalls = items.filter(i => i.type === 'missed_call').length;
      const pendingQuotes = items.filter(i => i.type === 'pending_quote').length;
      const callbacks = items.filter(i => i.type === 'callback_requested').length;
      const followUps = items.filter(i => i.type === 'follow_up_due').length;

      setData({
        actionItems: items,
        counts: {
          total: items.length,
          missed_calls: missedCalls,
          pending_quotes: pendingQuotes,
          callbacks: callbacks,
          follow_ups: followUps,
        },
      });
    } catch (error) {
      console.error('Error fetching action items:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle URL params for booking modal
  useEffect(() => {
    const leadId = searchParams.get('lead');
    const action = searchParams.get('action');

    if (leadId && action === 'book') {
      // Fetch the lead data
      const fetchLead = async () => {
        setLoadingLead(true);
        try {
          const response = await fetch(`/api/leads/${leadId}`);
          if (response.ok) {
            const lead = await response.json();
            setBookingLead(lead);
          } else {
            console.error('Failed to fetch lead');
            // Clear URL params on error
            router.replace('/action-items');
          }
        } catch (error) {
          console.error('Error fetching lead:', error);
          router.replace('/action-items');
        } finally {
          setLoadingLead(false);
        }
      };
      fetchLead();
    }
  }, [searchParams, router]);

  // Handler functions
  const handleBookJob = (item: ActionItem) => {
    if (item.leadId) {
      router.push(`/action-items?lead=${item.leadId}&action=book`);
    }
  };

  const handleViewQuote = (item: ActionItem) => {
    if (item.leadId) {
      // Navigate to lead detail page
      router.push(`/leads/${item.leadId}?from=/action-items`);
    }
  };

  const handleViewHistory = (item: ActionItem) => {
    if (item.customerId) {
      router.push(`/customers/${item.customerId}`);
    }
  };

  const handleViewDetails = (item: ActionItem) => {
    // Navigate to lead detail or customer detail based on item type
    if (item.leadId) {
      router.push(`/leads/${item.leadId}?from=/action-items`);
    } else if (item.customerId) {
      router.push(`/customers/${item.customerId}`);
    }
  };

  const handleMarkComplete = async (item: ActionItem) => {
    if (item.leadId) {
      try {
        await fetch(`/api/leads/${item.leadId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'converted' }),
        });
        fetchData();
      } catch (error) {
        console.error('Error marking complete:', error);
      }
    }
  };

  const handleSnooze = (item: ActionItem) => {
    setRemindModalItem(item);
  };

  const handleCloseBookingModal = () => {
    setBookingLead(null);
    router.replace('/action-items');
  };

  const handleJobBooked = (jobId: string) => {
    setBookingLead(null);
    fetchData(); // Refresh the list
    router.push(`/jobs/${jobId}`);
  };

  const handleSetReminder = async (remindAt: string) => {
    if (!remindModalItem?.leadId) return;

    try {
      await fetch(`/api/leads/${remindModalItem.leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remind_at: remindAt }),
      });
      fetchData();
      setRemindModalItem(null);
    } catch (error) {
      console.error('Error setting reminder:', error);
    }
  };

  // Filter items based on selected filter
  const getFilteredItems = (): ActionItem[] => {
    if (!data) return [];

    switch (selectedFilter) {
      case 'missed_calls':
        return data.actionItems.filter(i => i.type === 'missed_call');
      case 'pending_quotes':
        return data.actionItems.filter(i => i.type === 'pending_quote');
      case 'callbacks':
        return data.actionItems.filter(i => i.type === 'callback_requested');
      case 'follow_ups':
        return data.actionItems.filter(i => i.type === 'follow_up_due');
      default:
        return data.actionItems;
    }
  };

  if (loading) {
    return (
      <div className="p-4 lg:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-10 bg-gray-200 rounded" />
          <div className="h-48 bg-gray-200 rounded" />
          <div className="h-48 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const filteredItems = getFilteredItems();
  const hasItems = filteredItems.length > 0;

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Action Items</h1>
          <p className="text-sm text-gray-500">
            {data.counts.total} item{data.counts.total !== 1 ? 's' : ''} needing attention
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchData(true)}
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {filters.map((filter) => {
          const isSelected = selectedFilter === filter.type;
          const count = filter.type === 'all'
            ? data.counts.total
            : data.counts[filter.type as keyof typeof data.counts];

          return (
            <button
              key={filter.type}
              onClick={() => setSelectedFilter(filter.type)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                isSelected
                  ? 'bg-primary-100 text-primary-700 border border-primary-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {filter.label}
              {count > 0 && (
                <span className={cn(
                  'text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center',
                  isSelected ? 'bg-primary-200 text-primary-800' : 'bg-gray-200 text-gray-700'
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
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <ActionItemCard
              key={item.id}
              item={item}
              onBookJob={handleBookJob}
              onViewQuote={handleViewQuote}
              onViewHistory={handleViewHistory}
              onMarkComplete={handleMarkComplete}
              onSnooze={handleSnooze}
              onViewDetails={handleViewDetails}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg border p-8 text-center">
          <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            All caught up!
          </h3>
          <p className="text-gray-500">
            {selectedFilter === 'all'
              ? 'No action items need your attention right now'
              : `No ${filters.find(f => f.type === selectedFilter)?.label.toLowerCase()} items`}
          </p>
        </div>
      )}

      {/* Snooze/Remind Modal */}
      {remindModalItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4">Snooze Reminder</h3>
            <p className="text-sm text-gray-600 mb-4">
              When would you like to be reminded about {remindModalItem.title}?
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
                onClick={() => setRemindModalItem(null)}
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
