'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CallCard } from '@/components/calls/call-card';
import { Button } from '@/components/ui/button';
import { Phone, Search, X } from 'lucide-react';
import type { Call, CallOutcome } from '@/types/database';

const OUTCOME_OPTIONS: { value: CallOutcome | ''; label: string }[] = [
  { value: '', label: 'All Outcomes' },
  { value: 'completed', label: 'Booked' },
  { value: 'callback_later', label: 'Callback' },
  { value: 'sales_lead', label: 'Sales Lead' },
  { value: 'customer_hangup', label: 'Hung Up' },
  { value: 'out_of_area', label: 'Out of Area' },
  { value: 'wrong_number', label: 'Wrong Number' },
  { value: 'urgent_escalation', label: 'Urgent' },
  { value: 'safety_emergency', label: 'Emergency' },
];

export default function CallsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [calls, setCalls] = useState<Call[]>([]);
  const [total, setTotal] = useState(0);
  const [timezone, setTimezone] = useState('America/New_York');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [phoneSearch, setPhoneSearch] = useState(searchParams.get('phone') || '');
  const [outcomeFilter, setOutcomeFilter] = useState(searchParams.get('outcome') || '');

  // Pagination
  const [offset, setOffset] = useState(0);
  const limit = 20;

  useEffect(() => {
    async function fetchCalls() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (phoneSearch) params.set('phone', phoneSearch);
        if (outcomeFilter) params.set('outcome', outcomeFilter);
        params.set('limit', limit.toString());
        params.set('offset', offset.toString());

        const response = await fetch(`/api/calls?${params.toString()}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Failed to fetch calls');
          return;
        }

        setCalls(data.calls || []);
        setTotal(data.total || 0);
        if (data.timezone) setTimezone(data.timezone);
      } catch (err) {
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchCalls();
  }, [phoneSearch, outcomeFilter, offset]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setOffset(0);
    // Update URL params
    const params = new URLSearchParams();
    if (phoneSearch) params.set('phone', phoneSearch);
    if (outcomeFilter) params.set('outcome', outcomeFilter);
    router.push(`/calls?${params.toString()}`);
  };

  const clearFilters = () => {
    setPhoneSearch('');
    setOutcomeFilter('');
    setOffset(0);
    router.push('/calls');
  };

  const hasFilters = phoneSearch || outcomeFilter;

  if (loading && calls.length === 0) {
    return (
      <div className="p-4 lg:p-6">
        <div className="mb-4 lg:mb-6">
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Call History</h1>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-gray-200 rounded-lg w-full max-w-md" />
          <div className="h-32 bg-gray-200 rounded-lg" />
          <div className="h-32 bg-gray-200 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 lg:p-6">
        <div className="mb-4 lg:mb-6">
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Call History</h1>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-4 lg:mb-6">
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Call History</h1>
        <span className="text-sm text-gray-500">{total} calls</span>
      </div>

      {/* Filters */}
      <form onSubmit={handleSearch} className="mb-4 lg:mb-6">
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Phone Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by phone..."
              value={phoneSearch}
              onChange={(e) => setPhoneSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Outcome Filter */}
          <select
            value={outcomeFilter}
            onChange={(e) => {
              setOutcomeFilter(e.target.value);
              setOffset(0);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {OUTCOME_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Search Button */}
          <Button type="submit" variant="outline" size="sm">
            <Search className="w-4 h-4 mr-1" />
            Search
          </Button>

          {/* Clear Filters */}
          {hasFilters && (
            <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </form>

      {/* Calls List */}
      {calls.length === 0 ? (
        <div className="text-center py-12">
          <Phone className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No calls found</p>
          <p className="text-sm text-gray-400 mt-1">
            {hasFilters
              ? 'Try adjusting your filters'
              : 'Call records will appear here when synced from CallLock'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4">
            {calls.map((call) => (
              <CallCard
                key={call.id}
                call={call}
                timezone={timezone}
                onClick={() => router.push(`/calls/${call.id}`)}
              />
            ))}
          </div>

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - limit))}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-500">
                {offset + 1} - {Math.min(offset + limit, total)} of {total}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={offset + limit >= total}
                onClick={() => setOffset(offset + limit)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
