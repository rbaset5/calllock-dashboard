'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertsList } from '@/components/alerts';
import { Button } from '@/components/ui/button';
import { RefreshCw, Bell, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AlertsResponse, AlertWithDetails } from '@/app/api/alerts/route';
import type { AlertStatus, AlertType } from '@/types/database';

// Filter type for status
type StatusFilter = 'all' | AlertStatus;
type TypeFilter = 'all' | AlertType;

const statusFilters: { label: string; type: StatusFilter }[] = [
  { label: 'All', type: 'all' },
  { label: 'Pending', type: 'pending' },
  { label: 'Replied', type: 'replied' },
  { label: 'Resolved', type: 'resolved' },
];

const typeFilters: { label: string; type: TypeFilter; emoji: string }[] = [
  { label: 'All Types', type: 'all', emoji: '📋' },
  { label: 'Emergency', type: 'emergency', emoji: '🚨' },
  { label: 'Sales Lead', type: 'sales_lead', emoji: '💰' },
  { label: 'Missed Call', type: 'abandoned_call', emoji: '📵' },
];

export default function AlertsPage() {
  const [data, setData] = useState<AlertsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  const fetchData = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);

      // Build query params
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (typeFilter !== 'all') params.set('type', typeFilter);

      const response = await fetch(`/api/alerts?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch alerts');

      const alertsData: AlertsResponse = await response.json();
      setData(alertsData);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const hasAlerts = data.alerts.length > 0;
  const pendingCount = data.counts.pending;

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            SMS Alerts
          </h1>
          <p className="text-sm text-gray-500">
            {pendingCount > 0
              ? `${pendingCount} alert${pendingCount !== 1 ? 's' : ''} pending response`
              : 'All alerts handled'}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchData(true)}
          disabled={refreshing}
        >
          <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
        </Button>
      </div>

      {/* Status Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {statusFilters.map((filter) => {
          const isSelected = statusFilter === filter.type;
          const count = filter.type === 'all'
            ? data.counts.total
            : data.counts[filter.type as keyof typeof data.counts];

          return (
            <button
              key={filter.type}
              onClick={() => setStatusFilter(filter.type)}
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

      {/* Type Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {typeFilters.map((filter) => {
          const isSelected = typeFilter === filter.type;

          return (
            <button
              key={filter.type}
              onClick={() => setTypeFilter(filter.type)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                isSelected
                  ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              <span>{filter.emoji}</span>
              {filter.label}
            </button>
          );
        })}
      </div>

      {/* Alerts List */}
      {hasAlerts ? (
        <AlertsList
          alerts={data.alerts}
          emptyMessage={
            statusFilter === 'all' && typeFilter === 'all'
              ? 'No SMS alerts yet'
              : 'No alerts match the selected filters'
          }
        />
      ) : (
        <div className="bg-white rounded-lg border p-8 text-center">
          <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            All caught up!
          </h3>
          <p className="text-gray-500">
            {statusFilter === 'all' && typeFilter === 'all'
              ? 'No SMS alerts have been sent yet'
              : 'No alerts match the selected filters'}
          </p>
        </div>
      )}
    </div>
  );
}
