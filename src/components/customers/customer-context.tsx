'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { User, Wrench, Calendar, DollarSign, ChevronRight, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatRelativeTime } from '@/lib/format';
import type { Customer, Job, CustomerEquipment } from '@/types/database';

interface CustomerContextProps {
  phone: string;
}

interface CustomerContextData {
  found: boolean;
  customer?: Customer;
  serviceHistory?: Job[];
  timezone?: string;
}

interface AlertMetrics {
  total: number;
  pending: number;
  overdue: number;
}

/** Compact equipment list for context display */
function EquipmentListCompact({ equipment }: { equipment: CustomerEquipment[] }) {
  if (!equipment || equipment.length === 0) {
    return <span className="text-gray-500 italic">No equipment on file</span>;
  }

  return (
    <div className="space-y-1">
      {equipment.slice(0, 3).map((item, index) => (
        <div key={index} className="text-sm">
          <span className="font-medium text-gray-900">
            {item.brand ? `${item.brand} ` : ''}{item.type}
          </span>
          {item.year && (
            <span className="text-gray-500 ml-1">({item.year})</span>
          )}
        </div>
      ))}
      {equipment.length > 3 && (
        <p className="text-xs text-gray-500">+{equipment.length - 3} more</p>
      )}
    </div>
  );
}

export function CustomerContext({ phone }: CustomerContextProps) {
  const [data, setData] = useState<CustomerContextData | null>(null);
  const [alertMetrics, setAlertMetrics] = useState<AlertMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCustomerContext() {
      if (!phone) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Fetch customer and alerts in parallel
        const [customerRes, alertsRes] = await Promise.all([
          fetch(`/api/customers/by-phone?${new URLSearchParams({ phone }).toString()}`),
          fetch(`/api/emergency-alerts?${new URLSearchParams({ phone, limit: '5' }).toString()}`)
        ]);

        const customerResult = await customerRes.json();
        const alertsResult = await alertsRes.json();

        if (!customerRes.ok) {
          setError(customerResult.error || 'Failed to fetch customer');
          return;
        }

        setData(customerResult);

        if (alertsRes.ok && alertsResult.metrics) {
          setAlertMetrics(alertsResult.metrics);
        }
      } catch (err) {
        setError('Failed to load customer context');
      } finally {
        setLoading(false);
      }
    }

    fetchCustomerContext();
  }, [phone]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4" />
            Customer Context
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
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
            <User className="w-4 h-4" />
            Customer Context
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-500">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data?.found || !data.customer) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4" />
            Customer Context
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 italic">No customer on file for this phone number</p>
        </CardContent>
      </Card>
    );
  }

  const { customer, serviceHistory } = data;
  const completedJobs = serviceHistory?.filter(j => j.status === 'complete') || [];

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <User className="w-4 h-4" />
          Customer Context
        </CardTitle>
        <Link
          href={`/customers/${customer.id}`}
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          View Profile
          <ChevronRight className="w-4 h-4" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gray-50 rounded-lg p-2 text-center">
            <div className="flex items-center justify-center gap-1 text-gray-600">
              <Calendar className="w-3 h-3" />
              <span className="text-lg font-bold">{customer.total_jobs || 0}</span>
            </div>
            <p className="text-xs text-gray-500">Jobs</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2 text-center">
            <div className="flex items-center justify-center gap-1 text-green-600">
              <DollarSign className="w-3 h-3" />
              <span className="text-lg font-bold">
                {formatCurrency(customer.lifetime_value || 0).replace('$', '')}
              </span>
            </div>
            <p className="text-xs text-gray-500">Lifetime</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2 text-center">
            <div className="flex items-center justify-center gap-1 text-gray-600">
              <Clock className="w-3 h-3" />
              <span className="text-sm font-bold">
                {customer.last_service_at
                  ? formatRelativeTime(customer.last_service_at)
                  : 'Never'}
              </span>
            </div>
            <p className="text-xs text-gray-500">Last Service</p>
          </div>
        </div>

        {/* Equipment Section */}
        {customer.equipment && customer.equipment.length > 0 && (
          <div className="border-t pt-3">
            <div className="flex items-center gap-2 mb-2">
              <Wrench className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Equipment</span>
            </div>
            <EquipmentListCompact equipment={customer.equipment} />
          </div>
        )}

        {/* Recent Service Summary */}
        {completedJobs.length > 0 && (
          <div className="border-t pt-3">
            <p className="text-sm font-medium text-gray-700 mb-1">Recent Service</p>
            <p className="text-sm text-gray-600">
              {completedJobs[0].ai_summary || 'HVAC Service'}
              <span className="text-gray-400 ml-1">
                ({formatRelativeTime(completedJobs[0].scheduled_at || completedJobs[0].created_at)})
              </span>
            </p>
          </div>
        )}

        {/* Notes Preview */}
        {customer.notes && (
          <div className="border-t pt-3">
            <p className="text-sm font-medium text-gray-700 mb-1">Notes</p>
            <p className="text-sm text-gray-600 line-clamp-2">{customer.notes}</p>
          </div>
        )}

        {/* Alert Indicator */}
        {alertMetrics && alertMetrics.total > 0 && (
          <div className="border-t pt-3">
            <Link
              href="/alerts"
              className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition -mx-2"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className={alertMetrics.pending > 0 ? "w-4 h-4 text-yellow-500" : "w-4 h-4 text-gray-400"} />
                <span className="text-sm font-medium text-gray-700">
                  {alertMetrics.total} Alert{alertMetrics.total !== 1 ? 's' : ''}
                </span>
                {alertMetrics.pending > 0 && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                    {alertMetrics.pending} pending
                  </span>
                )}
                {alertMetrics.overdue > 0 && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                    {alertMetrics.overdue} overdue
                  </span>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
