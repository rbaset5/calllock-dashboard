'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Calendar,
  Phone,
  MapPin,
  CheckCircle2,
  XCircle,
  CalendarCheck,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Loader2,
  Clock,
  ArrowUpRight,
  Sparkles,
  User,
  Archive,
  Ban,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

interface HistoryItem {
  id: string;
  type: 'lead' | 'job';
  customer_name: string;
  customer_phone: string;
  customer_address: string | null;
  issue_description: string | null;
  ai_summary: string | null;
  status: string;
  outcome: 'booked' | 'completed' | 'lost' | 'cancelled' | 'spam';
  outcome_reason: string | null;
  priority_color: string | null;
  revenue_tier_label: string | null;
  estimated_value: number | null;
  actual_revenue: number | null;
  scheduled_at: string | null;
  completed_at: string | null;
  created_at: string;
  is_ai_booked?: boolean; // For jobs: was this booked by AI?
}

interface HistoryResponse {
  items: HistoryItem[];
  total: number;
  hasMore: boolean;
  stats: {
    booked: number;
    completed: number;
    lost: number;
    cancelled: number;
    totalRevenue: number;
  };
}

type FilterType = 'all' | 'booked' | 'archived' | 'spam';

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatPhoneDisplay(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// PRD V4 Badge Configuration
function getOutcomeConfig(item: HistoryItem) {
  // AI BOOKED (gold/green) - job booked by AI
  if (item.outcome === 'booked' && item.is_ai_booked) {
    return {
      icon: Sparkles,
      label: 'AI BOOKED',
      bgColor: 'bg-gold-100',
      textColor: 'text-gold-700',
      borderColor: 'border-gold-200',
    };
  }

  // YOU BOOKED (blue) - job booked manually
  if (item.outcome === 'booked' && !item.is_ai_booked) {
    return {
      icon: User,
      label: 'YOU BOOKED',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      borderColor: 'border-blue-200',
    };
  }

  // RESOLVED (gray) - completed jobs or resolved outcomes
  if (item.outcome === 'completed') {
    return {
      icon: CheckCircle2,
      label: 'RESOLVED',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-600',
      borderColor: 'border-gray-200',
    };
  }

  // ARCHIVED (gray) - lost leads that were archived
  if (item.outcome === 'lost' || item.outcome === 'cancelled') {
    return {
      icon: Archive,
      label: 'ARCHIVED',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-500',
      borderColor: 'border-gray-200',
    };
  }

  // SPAM (red) - spam/vendor leads
  if (item.outcome === 'spam' || item.priority_color === 'gray') {
    return {
      icon: Ban,
      label: 'SPAM',
      bgColor: 'bg-red-50',
      textColor: 'text-red-600',
      borderColor: 'border-red-200',
    };
  }

  // Default
  return {
    icon: Clock,
    label: item.outcome.toUpperCase(),
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-600',
    borderColor: 'border-gray-200',
  };
}

// ============================================
// HISTORY CARD COMPONENT
// ============================================

function HistoryCard({ item }: { item: HistoryItem }) {
  const [expanded, setExpanded] = useState(false);
  const config = getOutcomeConfig(item);
  const OutcomeIcon = config.icon;

  const handleCall = () => {
    const cleanPhone = item.customer_phone.replace(/\D/g, '');
    window.location.href = `tel:+1${cleanPhone}`;
  };

  return (
    <div
      className={cn(
        'bg-white rounded-lg border shadow-sm overflow-hidden transition-all',
        config.borderColor
      )}
    >
      {/* Main Card Content */}
      <div className="p-4">
        {/* Header Row */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 truncate">{item.customer_name}</h3>
            <p className="text-sm text-gray-500">{formatDate(item.completed_at || item.created_at)}</p>
          </div>

          {/* Outcome Badge */}
          <div
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
              config.bgColor,
              config.textColor
            )}
          >
            <OutcomeIcon className="w-3 h-3" />
            {config.label}
          </div>
        </div>

        {/* Issue Summary */}
        {item.ai_summary && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-3">{item.ai_summary}</p>
        )}

        {/* Quick Info Row */}
        <div className="flex items-center gap-4 text-sm text-gray-500">
          {item.actual_revenue && item.actual_revenue > 0 && (
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <DollarSign className="w-3.5 h-3.5" />
              {formatCurrency(item.actual_revenue)}
            </span>
          )}
          {!item.actual_revenue && item.revenue_tier_label && (
            <span className="text-gray-500">{item.revenue_tier_label}</span>
          )}
          {item.scheduled_at && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(item.scheduled_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          )}
        </div>

        {/* Expand/Collapse Toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mt-3"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              Less details
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              More details
            </>
          )}
        </button>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
          {/* Contact Info */}
          <div className="space-y-2">
            <button
              onClick={handleCall}
              className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
            >
              <Phone className="w-4 h-4" />
              {formatPhoneDisplay(item.customer_phone)}
              <ArrowUpRight className="w-3 h-3" />
            </button>

            {item.customer_address && (
              <p className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4 text-gray-400" />
                {item.customer_address}
              </p>
            )}
          </div>

          {/* Issue Description */}
          {item.issue_description && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Issue</p>
              <p className="text-sm text-gray-700">{item.issue_description}</p>
            </div>
          )}

          {/* Outcome Reason (for lost leads) */}
          {item.outcome_reason && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Reason</p>
              <p className="text-sm text-gray-700">{item.outcome_reason}</p>
            </div>
          )}

          {/* Revenue Details */}
          {(item.estimated_value || item.actual_revenue) && (
            <div className="flex gap-4">
              {item.estimated_value && (
                <div>
                  <p className="text-xs font-medium text-gray-500">Estimated</p>
                  <p className="text-sm text-gray-700">{formatCurrency(item.estimated_value)}</p>
                </div>
              )}
              {item.actual_revenue && (
                <div>
                  <p className="text-xs font-medium text-gray-500">Actual</p>
                  <p className="text-sm font-medium text-emerald-600">
                    {formatCurrency(item.actual_revenue)}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// FILTER TABS COMPONENT
// ============================================

function FilterTabs({
  selected,
  onChange,
  stats,
}: {
  selected: FilterType;
  onChange: (filter: FilterType) => void;
  stats: HistoryResponse['stats'] | null;
}) {
  // PRD V4 Filters: All, Booked, Archived, Spam
  const filters: { value: FilterType; label: string; count?: number }[] = [
    { value: 'all', label: 'All', count: stats ? stats.booked + stats.completed + stats.lost + stats.cancelled : undefined },
    { value: 'booked', label: 'Booked', count: stats?.booked },
    { value: 'archived', label: 'Archived', count: (stats?.completed || 0) + (stats?.lost || 0) },
    { value: 'spam', label: 'Spam', count: stats?.cancelled },
  ];

  return (
    <div className="flex gap-1 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
      {filters.map((filter) => (
        <button
          key={filter.value}
          onClick={() => onChange(filter.value)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
            selected === filter.value
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          )}
        >
          {filter.label}
          {filter.count !== undefined && filter.count > 0 && (
            <span
              className={cn(
                'text-xs',
                selected === filter.value ? 'text-white/80' : 'text-gray-400'
              )}
            >
              {filter.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ============================================
// STATS SUMMARY COMPONENT
// ============================================

function StatsSummary({ stats }: { stats: HistoryResponse['stats'] }) {
  return (
    <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-lg p-4 border border-emerald-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-emerald-700 uppercase tracking-wide">Total Revenue</p>
          <p className="text-2xl font-bold text-emerald-800">{formatCurrency(stats.totalRevenue)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-emerald-600">
            {stats.completed} completed job{stats.completed !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [stats, setStats] = useState<HistoryResponse['stats'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch history
  const fetchHistory = useCallback(
    async (append = false) => {
      try {
        if (append) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }

        const params = new URLSearchParams();
        if (debouncedSearch) params.set('search', debouncedSearch);
        if (filter !== 'all') params.set('filter', filter);
        params.set('limit', '20');
        params.set('offset', append ? items.length.toString() : '0');

        const response = await fetch(`/api/history?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch history');

        const data: HistoryResponse = await response.json();

        if (append) {
          setItems((prev) => [...prev, ...data.items]);
        } else {
          setItems(data.items);
          setStats(data.stats);
        }

        setHasMore(data.hasMore);
        setTotal(data.total);
      } catch (error) {
        console.error('Error fetching history:', error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [debouncedSearch, filter, items.length]
  );

  // Initial fetch and on filter change
  useEffect(() => {
    fetchHistory(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filter]);

  // Load more
  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchHistory(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900 mb-4">History</h1>

          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone, or address..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-lg border-0 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-primary-500 focus:bg-white"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <FilterTabs selected={filter} onChange={setFilter} stats={stats} />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Stats Summary (only show on 'all' or 'archived' filter) */}
        {stats && (filter === 'all' || filter === 'archived') && stats.totalRevenue > 0 && (
          <div className="mb-4">
            <StatsSummary stats={stats} />
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        )}

        {/* Empty State */}
        {!loading && items.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Clock className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No history yet</h3>
            <p className="text-sm text-gray-500">
              {search
                ? 'No results match your search'
                : 'Completed and lost leads will appear here'}
            </p>
          </div>
        )}

        {/* History Items */}
        {!loading && items.length > 0 && (
          <>
            <div className="space-y-3">
              {items.map((item) => (
                <HistoryCard key={`${item.type}-${item.id}`} item={item} />
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="w-full"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    `Load more (${items.length} of ${total})`
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
