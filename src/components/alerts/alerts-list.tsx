'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Phone, Clock, ArrowRight, AlertTriangle, DollarSign, PhoneMissed } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertStatusBadge, AlertTypeBadge, AlertReplyBadge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { AlertWithDetails } from '@/app/api/alerts/route';

interface AlertsListProps {
  alerts: AlertWithDetails[];
  emptyMessage?: string;
}

function getAlertIcon(alertType: string) {
  switch (alertType) {
    case 'emergency':
      return { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100' };
    case 'sales_lead':
      return { icon: DollarSign, color: 'text-yellow-600', bg: 'bg-yellow-100' };
    case 'abandoned_call':
      return { icon: PhoneMissed, color: 'text-gray-600', bg: 'bg-gray-100' };
    default:
      return { icon: Phone, color: 'text-blue-600', bg: 'bg-blue-100' };
  }
}

function AlertItem({ alert }: { alert: AlertWithDetails }) {
  const { icon: Icon, color, bg } = getAlertIcon(alert.alert_type);
  const isPending = alert.status === 'pending';

  // Get customer name and description from lead or job
  const customerName = alert.customer_name || alert.lead?.customer_name || alert.job?.customer_name || 'Unknown';
  const customerPhone = alert.customer_phone || alert.lead?.customer_phone || alert.job?.customer_phone || '';
  const description = alert.lead?.issue_description || alert.job?.ai_summary || '';

  // Determine link destination
  const linkHref = alert.lead_id
    ? `/leads/${alert.lead_id}`
    : alert.job_id
    ? `/jobs/${alert.job_id}`
    : null;

  const content = (
    <div className={cn(
      'flex gap-3 p-4 rounded-lg transition',
      isPending ? 'bg-yellow-50 border border-yellow-200' : 'hover:bg-gray-50',
      linkHref && 'cursor-pointer'
    )}>
      <div className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0', bg)}>
        <Icon className={cn('w-5 h-5', color)} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <AlertTypeBadge type={alert.alert_type} />
          <AlertStatusBadge status={alert.status} />
          {alert.reply_code && (
            <AlertReplyBadge code={alert.reply_code} label={alert.reply_label} />
          )}
        </div>

        <div className="mt-2">
          <span className="font-medium text-gray-900">{customerName}</span>
          {customerPhone && (
            <span className="text-sm text-gray-500 ml-2">{customerPhone}</span>
          )}
        </div>

        {description && (
          <p className="text-sm text-gray-600 line-clamp-2 mt-1">
            {description}
          </p>
        )}

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
            {alert.replied_at && (
              <span className="text-gray-500 ml-2">
                • Replied {formatDistanceToNow(new Date(alert.replied_at), { addSuffix: true })}
              </span>
            )}
          </div>

          {linkHref && (
            <span className="text-xs text-primary-600 flex items-center gap-1">
              View {alert.lead_id ? 'Lead' : 'Job'}
              <ArrowRight className="w-3 h-3" />
            </span>
          )}
        </div>
      </div>
    </div>
  );

  if (linkHref) {
    return <Link href={linkHref}>{content}</Link>;
  }

  return content;
}

export function AlertsList({ alerts, emptyMessage = 'No alerts found' }: AlertsListProps) {
  if (alerts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-gray-500">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  // Group pending alerts at the top
  const pendingAlerts = alerts.filter(a => a.status === 'pending');
  const otherAlerts = alerts.filter(a => a.status !== 'pending');

  return (
    <div className="space-y-2">
      {pendingAlerts.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            {pendingAlerts.length} Pending Alert{pendingAlerts.length !== 1 ? 's' : ''}
          </h3>
          <Card>
            <CardContent className="divide-y divide-gray-100 p-0">
              {pendingAlerts.map(alert => (
                <AlertItem key={alert.id} alert={alert} />
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {otherAlerts.length > 0 && (
        <div>
          {pendingAlerts.length > 0 && (
            <h3 className="text-sm font-medium text-gray-500 mb-2">Previous Alerts</h3>
          )}
          <Card>
            <CardContent className="divide-y divide-gray-100 p-0">
              {otherAlerts.map(alert => (
                <AlertItem key={alert.id} alert={alert} />
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
