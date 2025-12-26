'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { UserCheck, Calendar, DollarSign, Clock, Wrench, ChevronRight, RefreshCw } from 'lucide-react';
import { formatCurrency, formatRelativeTime } from '@/lib/format';
import { formatEquipmentDisplay } from '@/lib/equipment-utils';
import { cn } from '@/lib/utils';
import type { Customer, Job, CustomerEquipment } from '@/types/database';

interface CustomerIntelligenceCardProps {
  phone: string;
  className?: string;
}

interface CustomerContextData {
  found: boolean;
  customer?: Customer;
  serviceHistory?: Job[];
  timezone?: string;
}

/**
 * Customer Intelligence Card - Prominent display for repeat customers
 * Only renders if customer has history (total_jobs > 0)
 * Designed to highlight returning customer value
 */
export function CustomerIntelligenceCard({ phone, className }: CustomerIntelligenceCardProps) {
  const [data, setData] = useState<CustomerContextData | null>(null);
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
        const response = await fetch(
          `/api/customers/by-phone?${new URLSearchParams({ phone }).toString()}`
        );
        const result = await response.json();

        if (!response.ok) {
          setError(result.error || 'Failed to fetch customer');
          return;
        }

        setData(result);
      } catch (err) {
        setError('Failed to load customer context');
      } finally {
        setLoading(false);
      }
    }

    fetchCustomerContext();
  }, [phone]);

  // Calculate call count from service history
  const callCount = useMemo(() => {
    if (!data?.serviceHistory) return 0;
    return data.serviceHistory.length;
  }, [data?.serviceHistory]);

  // Don't render if loading, error, or no customer with history
  if (loading) {
    return (
      <div className={cn('animate-pulse bg-gray-50 rounded-lg p-4', className)}>
        <div className="h-5 bg-gray-200 rounded w-1/3 mb-3" />
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="h-12 bg-gray-200 rounded" />
          <div className="h-12 bg-gray-200 rounded" />
          <div className="h-12 bg-gray-200 rounded" />
        </div>
        <div className="h-8 bg-gray-200 rounded w-2/3" />
      </div>
    );
  }

  // Don't render card for new customers (no history)
  if (!data?.found || !data.customer || (data.customer.total_jobs || 0) === 0) {
    return null;
  }

  const { customer } = data;

  return (
    <div
      className={cn(
        'rounded-lg border overflow-hidden',
        'bg-amber-50 border-amber-200',
        className
      )}
    >
      {/* Header - Repeat Customer Badge */}
      <div className="flex items-center justify-between px-4 py-3 bg-amber-100/50 border-b border-amber-200">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-200">
            <RefreshCw className="w-4 h-4 text-amber-700" />
          </div>
          <div>
            <p className="font-semibold text-amber-900">Repeat Customer</p>
            {callCount > 1 && (
              <p className="text-xs text-amber-700">Called {callCount} times before</p>
            )}
          </div>
        </div>
        <Link
          href={`/customers/${customer.id}`}
          className="text-sm text-amber-700 hover:text-amber-800 flex items-center gap-1"
        >
          Profile
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {/* Total Jobs */}
          <div className="bg-white/60 rounded-lg p-2 text-center">
            <div className="flex items-center justify-center gap-1 text-amber-800">
              <Calendar className="w-3.5 h-3.5" />
              <span className="text-lg font-bold">{customer.total_jobs || 0}</span>
            </div>
            <p className="text-xs text-amber-700">Jobs</p>
          </div>

          {/* Lifetime Value */}
          <div className="bg-white/60 rounded-lg p-2 text-center">
            <div className="flex items-center justify-center gap-1 text-green-700">
              <DollarSign className="w-3.5 h-3.5" />
              <span className="text-lg font-bold">
                {formatCurrency(customer.lifetime_value || 0).replace('$', '')}
              </span>
            </div>
            <p className="text-xs text-amber-700">Lifetime</p>
          </div>

          {/* Last Service */}
          <div className="bg-white/60 rounded-lg p-2 text-center">
            <div className="flex items-center justify-center gap-1 text-amber-800">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <p className="text-sm font-semibold text-amber-800">
              {customer.last_service_at
                ? formatRelativeTime(customer.last_service_at).replace(' ago', '')
                : 'Never'}
            </p>
            <p className="text-xs text-amber-700">Last Service</p>
          </div>
        </div>

        {/* Equipment List */}
        {customer.equipment && customer.equipment.length > 0 && (
          <div className="border-t border-amber-200 pt-3">
            <div className="flex items-center gap-2 mb-2">
              <Wrench className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">Equipment on File</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {customer.equipment.slice(0, 4).map((item, index) => (
                <EquipmentChip key={index} equipment={item} />
              ))}
              {customer.equipment.length > 4 && (
                <span className="inline-flex items-center px-2 py-1 text-xs text-amber-700">
                  +{customer.equipment.length - 4} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Compact equipment chip for the intelligence card
 */
function EquipmentChip({ equipment }: { equipment: CustomerEquipment }) {
  const currentYear = new Date().getFullYear();
  const age = equipment.year ? currentYear - equipment.year : null;

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/80 rounded-full text-sm border border-amber-200">
      <span className="font-medium text-gray-900">
        {equipment.brand && `${equipment.brand} `}
        {equipment.type}
      </span>
      {age !== null && (
        <span className="text-gray-500">
          ({age}y)
        </span>
      )}
    </span>
  );
}

/**
 * Compact inline version for lists
 */
export function CustomerIntelligenceBadge({ phone }: { phone: string }) {
  const [data, setData] = useState<CustomerContextData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCustomerContext() {
      if (!phone) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/customers/by-phone?${new URLSearchParams({ phone }).toString()}`
        );
        const result = await response.json();
        if (response.ok) {
          setData(result);
        }
      } catch (err) {
        // Silently fail for badge
      } finally {
        setLoading(false);
      }
    }

    fetchCustomerContext();
  }, [phone]);

  if (loading || !data?.found || !data.customer || (data.customer.total_jobs || 0) === 0) {
    return null;
  }

  const { customer } = data;

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
      <RefreshCw className="w-3 h-3" />
      <span>{customer.total_jobs} jobs</span>
      <span className="text-amber-500">•</span>
      <span className="text-green-700">{formatCurrency(customer.lifetime_value || 0)}</span>
    </span>
  );
}

export default CustomerIntelligenceCard;
