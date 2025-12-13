'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow, format, isPast, differenceInMinutes } from 'date-fns';
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Phone,
  RefreshCw,
  MapPin,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { EmergencyAlert, CallbackStatus } from '@/types/database';

interface EmergencyAlertsResponse {
  alerts: EmergencyAlert[];
  metrics: {
    total: number;
    pending: number;
    delivered: number;
    expired: number;
    overdue: number;
  };
  total: number;
  limit: number;
  offset: number;
}

function getStatusConfig(status: CallbackStatus, isOverdue: boolean) {
  if (status === 'pending' && isOverdue) {
    return {
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-100',
      label: 'OVERDUE',
      badgeClass: 'bg-red-100 text-red-700 border-red-200',
    };
  }

  switch (status) {
    case 'pending':
      return {
        icon: Clock,
        color: 'text-yellow-600',
        bg: 'bg-yellow-100',
        label: 'Pending',
        badgeClass: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      };
    case 'delivered':
      return {
        icon: CheckCircle,
        color: 'text-green-600',
        bg: 'bg-green-100',
        label: 'Delivered',
        badgeClass: 'bg-green-100 text-green-700 border-green-200',
      };
    case 'expired':
      return {
        icon: XCircle,
        color: 'text-gray-400',
        bg: 'bg-gray-100',
        label: 'Expired',
        badgeClass: 'bg-gray-100 text-gray-600 border-gray-200',
      };
    case 'no_answer':
      return {
        icon: Phone,
        color: 'text-orange-600',
        bg: 'bg-orange-100',
        label: 'No Answer',
        badgeClass: 'bg-orange-100 text-orange-700 border-orange-200',
      };
    default:
      return {
        icon: Clock,
        color: 'text-gray-600',
        bg: 'bg-gray-100',
        label: status,
        badgeClass: 'bg-gray-100 text-gray-600 border-gray-200',
      };
  }
}

function getTimeRemaining(promisedBy: string): { text: string; isOverdue: boolean; urgency: 'critical' | 'warning' | 'normal' } {
  const deadline = new Date(promisedBy);
  const now = new Date();

  if (isPast(deadline)) {
    const minutesOverdue = differenceInMinutes(now, deadline);
    return {
      text: `${minutesOverdue}m overdue`,
      isOverdue: true,
      urgency: 'critical',
    };
  }

  const minutesRemaining = differenceInMinutes(deadline, now);

  if (minutesRemaining <= 5) {
    return {
      text: `${minutesRemaining}m remaining`,
      isOverdue: false,
      urgency: 'critical',
    };
  }

  if (minutesRemaining <= 10) {
    return {
      text: `${minutesRemaining}m remaining`,
      isOverdue: false,
      urgency: 'warning',
    };
  }

  return {
    text: `${minutesRemaining}m remaining`,
    isOverdue: false,
    urgency: 'normal',
  };
}

interface EmergencyAlertItemProps {
  alert: EmergencyAlert;
  onMarkDelivered: (alertId: string) => void;
}

function EmergencyAlertItem({ alert, onMarkDelivered }: EmergencyAlertItemProps) {
  const timeInfo = alert.callback_status === 'pending'
    ? getTimeRemaining(alert.callback_promised_by)
    : null;

  const isOverdue = timeInfo?.isOverdue ?? false;
  const config = getStatusConfig(alert.callback_status, isOverdue);
  const Icon = config.icon;

  return (
    <div className={cn(
      'p-4 rounded-lg transition border',
      alert.callback_status === 'pending' && isOverdue
        ? 'bg-red-50 border-red-200'
        : alert.callback_status === 'pending'
        ? 'bg-yellow-50 border-yellow-200'
        : 'bg-white border-gray-200 hover:bg-gray-50'
    )}>
      <div className="flex gap-3">
        <div className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0', config.bg)}>
          <Icon className={cn('w-5 h-5', config.color)} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Header row with badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full font-medium border',
              config.badgeClass
            )}>
              {config.label}
            </span>
            {alert.urgency_tier && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                {alert.urgency_tier}
              </span>
            )}
            {timeInfo && alert.callback_status === 'pending' && (
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full font-medium',
                timeInfo.urgency === 'critical' ? 'bg-red-100 text-red-700' :
                timeInfo.urgency === 'warning' ? 'bg-orange-100 text-orange-700' :
                'bg-gray-100 text-gray-600'
              )}>
                {timeInfo.text}
              </span>
            )}
          </div>

          {/* Customer info */}
          <div className="mt-2">
            <span className="font-medium text-gray-900">
              {alert.customer_name || 'Unknown Customer'}
            </span>
            <span className="text-sm text-gray-500 ml-2 flex items-center gap-1 inline-flex">
              <Phone className="w-3 h-3" />
              {alert.phone_number}
            </span>
          </div>

          {/* Problem description */}
          <p className="text-sm text-gray-700 mt-1 line-clamp-2">
            {alert.problem_description}
          </p>

          {/* Address if available */}
          {alert.customer_address && (
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {alert.customer_address}
            </p>
          )}

          {/* Footer with time and actions */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              SMS sent {formatDistanceToNow(new Date(alert.sms_sent_at), { addSuffix: true })}
              {alert.callback_delivered_at && (
                <span className="text-green-600 ml-2">
                  • Callback at {format(new Date(alert.callback_delivered_at), 'h:mm a')}
                </span>
              )}
            </div>

            {/* Mark as delivered button for pending alerts */}
            {alert.callback_status === 'pending' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onMarkDelivered(alert.id)}
                className="text-xs h-7 px-2"
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                Mark Delivered
              </Button>
            )}

            {/* View details for resolved alerts */}
            {alert.callback_status !== 'pending' && alert.converted_to_job_id && (
              <a
                href={`/jobs/${alert.converted_to_job_id}`}
                className="text-xs text-primary-600 flex items-center gap-1 hover:underline"
              >
                View Job
                <ChevronRight className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function EmergencyAlertsTracker() {
  const [data, setData] = useState<EmergencyAlertsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<CallbackStatus | 'all'>('all');

  const fetchData = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);

      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      params.set('limit', '50');

      const response = await fetch(`/api/emergency-alerts?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch emergency alerts');

      const alertsData: EmergencyAlertsResponse = await response.json();
      setData(alertsData);
    } catch (error) {
      console.error('Error fetching emergency alerts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchData();
    // Refresh every 30 seconds to keep countdown accurate
    const interval = setInterval(() => fetchData(), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleMarkDelivered = async (alertId: string) => {
    try {
      const response = await fetch('/api/emergency-alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alert_id: alertId,
          callback_status: 'delivered',
          callback_delivered_at: new Date().toISOString(),
        }),
      });

      if (!response.ok) throw new Error('Failed to update alert');

      // Refresh the list
      fetchData(true);
    } catch (error) {
      console.error('Error marking alert as delivered:', error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Emergency Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-24 bg-gray-200 rounded" />
            <div className="h-24 bg-gray-200 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { alerts, metrics } = data;

  // Group alerts by status
  const overdueAlerts = alerts.filter(
    a => a.callback_status === 'pending' && isPast(new Date(a.callback_promised_by))
  );
  const pendingAlerts = alerts.filter(
    a => a.callback_status === 'pending' && !isPast(new Date(a.callback_promised_by))
  );
  const resolvedAlerts = alerts.filter(a => a.callback_status !== 'pending');

  const statusFilters: { label: string; value: CallbackStatus | 'all'; count: number }[] = [
    { label: 'All', value: 'all', count: metrics.total },
    { label: 'Pending', value: 'pending', count: metrics.pending },
    { label: 'Delivered', value: 'delivered', count: metrics.delivered },
    { label: 'Expired', value: 'expired', count: metrics.expired },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            Emergency Callback Tracking
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchData(true)}
            disabled={refreshing}
          >
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
          </Button>
        </div>

        {/* Metrics summary */}
        {metrics.overdue > 0 && (
          <div className="mt-2 p-2 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-red-700 font-medium flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              {metrics.overdue} callback{metrics.overdue !== 1 ? 's' : ''} overdue!
            </p>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2">
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                statusFilter === filter.value
                  ? 'bg-primary-100 text-primary-700 border border-primary-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {filter.label}
              {filter.count > 0 && (
                <span className={cn(
                  'text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center',
                  statusFilter === filter.value ? 'bg-primary-200 text-primary-800' : 'bg-gray-200 text-gray-700'
                )}>
                  {filter.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Alerts list */}
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {statusFilter === 'all'
                ? 'No emergency alerts'
                : `No ${statusFilter} alerts`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Overdue alerts (critical) */}
            {overdueAlerts.length > 0 && statusFilter !== 'delivered' && statusFilter !== 'expired' && (
              <div>
                <h3 className="text-sm font-medium text-red-600 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Overdue ({overdueAlerts.length})
                </h3>
                <div className="space-y-2">
                  {overdueAlerts.map(alert => (
                    <EmergencyAlertItem
                      key={alert.id}
                      alert={alert}
                      onMarkDelivered={handleMarkDelivered}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Pending alerts */}
            {pendingAlerts.length > 0 && statusFilter !== 'delivered' && statusFilter !== 'expired' && (
              <div>
                <h3 className="text-sm font-medium text-yellow-600 mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Pending ({pendingAlerts.length})
                </h3>
                <div className="space-y-2">
                  {pendingAlerts.map(alert => (
                    <EmergencyAlertItem
                      key={alert.id}
                      alert={alert}
                      onMarkDelivered={handleMarkDelivered}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Resolved alerts */}
            {resolvedAlerts.length > 0 && statusFilter !== 'pending' && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Resolved ({resolvedAlerts.length})
                </h3>
                <div className="space-y-2">
                  {resolvedAlerts.map(alert => (
                    <EmergencyAlertItem
                      key={alert.id}
                      alert={alert}
                      onMarkDelivered={handleMarkDelivered}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
