'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Phone, PhoneIncoming, PhoneOutgoing, Clock, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatRelativeTime } from '@/lib/format';
import { formatPhone } from '@/lib/utils';
import type { Call } from '@/types/database';

interface CallHistoryListProps {
  phone: string;
  limit?: number;
  showHeader?: boolean;
}

/** Format call duration for compact display */
function formatDuration(seconds: number | null): string {
  if (!seconds) return '--';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

/** Get outcome badge color and label */
function getOutcomeDisplay(outcome: string | null): { label: string; color: string } {
  const outcomes: Record<string, { label: string; color: string }> = {
    completed: { label: 'Booked', color: 'bg-green-100 text-green-700' },
    callback_later: { label: 'Callback', color: 'bg-blue-100 text-blue-700' },
    sales_lead: { label: 'Sales', color: 'bg-purple-100 text-purple-700' },
    customer_hangup: { label: 'Hung Up', color: 'bg-red-100 text-red-700' },
    wrong_number: { label: 'Wrong #', color: 'bg-gray-100 text-gray-600' },
    out_of_area: { label: 'Out of Area', color: 'bg-amber-100 text-amber-700' },
    safety_emergency: { label: 'Emergency', color: 'bg-red-100 text-red-700' },
    urgent_escalation: { label: 'Urgent', color: 'bg-orange-100 text-orange-700' },
    waitlist_added: { label: 'Waitlist', color: 'bg-purple-100 text-purple-600' },
    cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-600' },
    rescheduled: { label: 'Rescheduled', color: 'bg-blue-100 text-blue-700' },
  };
  return outcomes[outcome || ''] || { label: outcome || 'Unknown', color: 'bg-gray-100 text-gray-600' };
}

export function CallHistoryList({ phone, limit = 5, showHeader = true }: CallHistoryListProps) {
  const [calls, setCalls] = useState<Call[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCalls() {
      if (!phone) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          phone,
          limit: limit.toString(),
        });

        const response = await fetch(`/api/calls?${params.toString()}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Failed to fetch calls');
          return;
        }

        setCalls(data.calls || []);
        setTotal(data.total || 0);
      } catch (err) {
        setError('Failed to load call history');
      } finally {
        setLoading(false);
      }
    }

    fetchCalls();
  }, [phone, limit]);

  if (loading) {
    return (
      <Card>
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Call History
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-12 bg-gray-100 rounded" />
            <div className="h-12 bg-gray-100 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Call History
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <p className="text-sm text-red-500">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (calls.length === 0) {
    return (
      <Card>
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Call History
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <p className="text-sm text-gray-500">No call history for this customer</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {showHeader && (
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Call History
          </CardTitle>
          {total > limit && (
            <Link
              href={`/calls?phone=${encodeURIComponent(phone)}`}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View all ({total})
            </Link>
          )}
        </CardHeader>
      )}
      <CardContent className="p-0">
        <ul className="divide-y divide-gray-100">
          {calls.map((call) => {
            const outcomeDisplay = getOutcomeDisplay(call.outcome);
            const DirectionIcon = call.direction === 'inbound' ? PhoneIncoming : PhoneOutgoing;

            return (
              <li key={call.id}>
                <Link
                  href={`/calls/${call.id}`}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 transition"
                >
                  {/* Direction Icon */}
                  <DirectionIcon
                    className={`w-4 h-4 flex-shrink-0 ${
                      call.direction === 'inbound' ? 'text-green-600' : 'text-blue-600'
                    }`}
                  />

                  {/* Call Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {formatRelativeTime(call.started_at)}
                      </span>
                      <span className={`inline-flex items-center px-1.5 py-0.5 text-xs rounded ${outcomeDisplay.color}`}>
                        {outcomeDisplay.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{formatDuration(call.duration_seconds)}</span>
                      {call.hvac_issue_type && (
                        <>
                          <span>•</span>
                          <span>{call.hvac_issue_type}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </Link>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
