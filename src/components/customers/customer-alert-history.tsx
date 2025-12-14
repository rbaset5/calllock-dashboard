'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatRelativeTime, formatDateTime } from '@/lib/format';
import type { EmergencyAlert, CallbackStatus } from '@/types/database';
import { cn } from '@/lib/utils';

interface CustomerAlertHistoryProps {
  phone: string;
  compact?: boolean; // Show only count + pending indicator
}

interface AlertsResponse {
  alerts: EmergencyAlert[];
  metrics: {
    total: number;
    pending: number;
    delivered: number;
    expired: number;
    overdue: number;
  };
}

/** Get status display info */
function getStatusDisplay(status: CallbackStatus): { label: string; color: string; icon: typeof CheckCircle } {
  switch (status) {
    case 'delivered':
      return { label: 'Callback Delivered', color: 'bg-green-100 text-green-700', icon: CheckCircle };
    case 'expired':
      return { label: 'Expired', color: 'bg-gray-100 text-gray-600', icon: XCircle };
    case 'no_answer':
      return { label: 'No Answer', color: 'bg-orange-100 text-orange-700', icon: XCircle };
    default:
      return { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock };
  }
}

/** Check if callback is overdue */
function isOverdue(alert: EmergencyAlert): boolean {
  if (alert.callback_status !== 'pending') return false;
  return new Date(alert.callback_promised_by) < new Date();
}

export function CustomerAlertHistory({ phone, compact = false }: CustomerAlertHistoryProps) {
  const [data, setData] = useState<AlertsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    async function fetchAlerts() {
      if (!phone) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ phone, limit: '20' });
        const response = await fetch(`/api/emergency-alerts?${params.toString()}`);
        const result = await response.json();

        if (!response.ok) {
          setError(result.error || 'Failed to fetch alerts');
          return;
        }

        setData(result);
      } catch (err) {
        setError('Failed to load alert history');
      } finally {
        setLoading(false);
      }
    }

    fetchAlerts();
  }, [phone]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Alert History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-100 rounded w-2/3" />
            <div className="h-4 bg-gray-100 rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Alert History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-500">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.alerts.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-gray-400" />
            Alert History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 italic">No emergency alerts on file</p>
        </CardContent>
      </Card>
    );
  }

  const { alerts, metrics } = data;
  const displayAlerts = expanded ? alerts : alerts.slice(0, 3);
  const hasMore = alerts.length > 3;

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className={cn(
            "w-4 h-4",
            metrics.pending > 0 ? "text-yellow-500" : "text-gray-400"
          )} />
          Alert History
          {metrics.pending > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
              {metrics.pending} pending
            </span>
          )}
        </CardTitle>
        <Link
          href="/alerts"
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          View All
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary Stats */}
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span>{metrics.total} total</span>
          <span className="text-gray-300">|</span>
          <span className="text-green-600">{metrics.delivered} delivered</span>
          {metrics.overdue > 0 && (
            <>
              <span className="text-gray-300">|</span>
              <span className="text-red-600 font-medium">{metrics.overdue} overdue</span>
            </>
          )}
        </div>

        {/* Alert List */}
        <div className="space-y-2">
          {displayAlerts.map((alert) => {
            const statusInfo = getStatusDisplay(alert.callback_status);
            const StatusIcon = statusInfo.icon;
            const overdue = isOverdue(alert);

            return (
              <div
                key={alert.id}
                className={cn(
                  "border rounded-lg p-3",
                  overdue ? "border-red-200 bg-red-50" : "border-gray-100"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {alert.urgency_tier}: {alert.problem_description}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatRelativeTime(alert.sms_sent_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {overdue && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                        OVERDUE
                      </span>
                    )}
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                      statusInfo.color
                    )}>
                      <StatusIcon className="w-3 h-3" />
                      {statusInfo.label}
                    </span>
                  </div>
                </div>

                {/* SLA Info */}
                {alert.callback_status === 'pending' && (
                  <p className="text-xs text-gray-500 mt-1">
                    Callback promised by: {formatDateTime(alert.callback_promised_by, 'America/New_York')}
                  </p>
                )}

                {/* Delivered Info */}
                {alert.callback_status === 'delivered' && alert.callback_delivered_at && (
                  <p className="text-xs text-green-600 mt-1">
                    Delivered: {formatRelativeTime(alert.callback_delivered_at)}
                  </p>
                )}

                {/* Resolution Notes */}
                {alert.resolution_notes && (
                  <p className="text-xs text-gray-600 mt-1 italic">
                    Note: {alert.resolution_notes}
                  </p>
                )}

                {/* Related Job Link */}
                {alert.converted_to_job_id && (
                  <Link
                    href={`/jobs/${alert.converted_to_job_id}`}
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-2"
                  >
                    View Job →
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        {/* Show More/Less */}
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Show {alerts.length - 3} more
              </>
            )}
          </button>
        )}
      </CardContent>
    </Card>
  );
}
