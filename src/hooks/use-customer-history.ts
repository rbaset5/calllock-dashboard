/**
 * useCustomerHistory Hook
 *
 * Fetches customer history by phone number for the RecoveryCard "Context Box".
 * Uses the existing /api/customers/by-phone endpoint.
 */

import { useState, useEffect, useCallback } from 'react';
import type { Customer, Job, Lead, Call } from '@/types/database';

export interface CustomerHistory {
  found: boolean;
  customer?: Customer;
  serviceHistory?: Job[];
  leads?: Lead[];
  calls?: Call[];
  timezone?: string;
}

interface UseCustomerHistoryReturn {
  data: CustomerHistory | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Fetch customer history by phone number.
 *
 * @param phone - The customer's phone number (can be null/undefined to skip fetch)
 * @returns Object containing data, loading state, error, and refetch function
 *
 * @example
 * ```tsx
 * const { data, loading, error } = useCustomerHistory(lead.customer_phone);
 *
 * if (loading) return <Spinner />;
 * if (data?.found) {
 *   // Show customer history
 *   console.log(data.serviceHistory?.length, 'previous jobs');
 * }
 * ```
 */
export function useCustomerHistory(phone: string | null | undefined): UseCustomerHistoryReturn {
  const [data, setData] = useState<CustomerHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!phone) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/customers/by-phone?phone=${encodeURIComponent(phone)}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch customer history: ${response.status}`);
      }

      const result: CustomerHistory = await response.json();
      setData(result);
    } catch (err) {
      console.error('[useCustomerHistory] Error:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [phone]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { data, loading, error, refetch: fetchHistory };
}

/**
 * Helper to summarize customer history for display.
 */
export function summarizeHistory(data: CustomerHistory | null): {
  totalJobs: number;
  totalLeads: number;
  totalCalls: number;
  lastServiceDate: string | null;
  lastTechName: string | null;
  lastNote: string | null;
  lifetimeValue: number;
  isRepeatCustomer: boolean;
} {
  if (!data || !data.found) {
    return {
      totalJobs: 0,
      totalLeads: 0,
      totalCalls: 0,
      lastServiceDate: null,
      lastTechName: null,
      lastNote: null,
      lifetimeValue: 0,
      isRepeatCustomer: false,
    };
  }

  const jobs = data.serviceHistory || [];
  const leads = data.leads || [];
  const calls = data.calls || [];

  // Find last completed job
  const completedJobs = jobs.filter(j => j.status === 'complete');
  const lastService = completedJobs.length > 0
    ? completedJobs.sort((a, b) =>
      new Date(b.completed_at || b.scheduled_at || 0).getTime() -
      new Date(a.completed_at || a.scheduled_at || 0).getTime()
    )[0]
    : null;

  // Calculate lifetime value from completed jobs
  const lifetimeValue = completedJobs.reduce((sum, job) => sum + (job.revenue || 0), 0);

  return {
    totalJobs: jobs.length,
    totalLeads: leads.length,
    totalCalls: calls.length,
    lastServiceDate: lastService?.completed_at || lastService?.scheduled_at || null,
    lastTechName: lastService?.assigned_tech_name || null,
    lastNote: lastService?.notes || null,
    lifetimeValue,
    isRepeatCustomer: jobs.length > 1 || (jobs.length === 1 && leads.length > 0),
  };
}
