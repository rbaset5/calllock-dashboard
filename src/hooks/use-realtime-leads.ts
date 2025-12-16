'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Lead, PriorityColor } from '@/types/database';
import { ActionResponse } from '@/app/api/action/route';

interface UseRealtimeLeadsOptions {
  /** Filter by priority color */
  priorityColor?: PriorityColor;
  /** Include snoozed leads */
  includeSnoozed?: boolean;
  /** Callback when new lead arrives */
  onNewLead?: (lead: Lead) => void;
  /** Callback when lead is updated */
  onLeadUpdate?: (lead: Lead) => void;
  /** Polling fallback interval in ms (default: 30000) */
  pollingInterval?: number;
}

/**
 * V4 Realtime Leads Hook
 *
 * Provides live updates for ACTION items using Supabase Realtime.
 * Falls back to polling if realtime fails.
 *
 * Target latency: < 2 seconds from webhook to UI update
 */
export function useRealtimeLeads(options: UseRealtimeLeadsOptions = {}) {
  const {
    priorityColor,
    includeSnoozed = false,
    onNewLead,
    onLeadUpdate,
    pollingInterval = 30000,
  } = options;

  const [leads, setLeads] = useState<Lead[]>([]);
  const [counts, setCounts] = useState({
    total: 0,
    red: 0,
    green: 0,
    blue: 0,
    gray: 0,
  });
  const [pendingOutcome, setPendingOutcome] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  const supabase = createClient();
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch leads from API
  const fetchLeads = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (priorityColor) {
        params.set('priority_color', priorityColor);
      }
      if (includeSnoozed) {
        params.set('include_snoozed', 'true');
      }

      const response = await fetch(`/api/action?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch leads');
      }

      const data: ActionResponse = await response.json();
      setLeads(data.leads);
      setCounts(data.counts);
      setPendingOutcome(data.pendingOutcome);
      setError(null);
    } catch (err) {
      console.error('Error fetching leads:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [priorityColor, includeSnoozed]);

  // Start polling fallback
  const startPolling = useCallback(() => {
    if (pollingRef.current) return;

    pollingRef.current = setInterval(() => {
      fetchLeads();
    }, pollingInterval);
  }, [fetchLeads, pollingInterval]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchLeads();

    // Set up realtime subscription
    const channel = supabase
      .channel('leads-realtime-v4')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
        },
        (payload) => {
          const newLead = payload.new as Lead;

          // Check if lead matches filter
          if (priorityColor && newLead.priority_color !== priorityColor) {
            return;
          }

          // Add to front of list
          setLeads((prev) => [newLead, ...prev]);

          // Update counts
          setCounts((prev) => ({
            ...prev,
            total: prev.total + 1,
            [newLead.priority_color]: (prev[newLead.priority_color as keyof typeof prev] || 0) + 1,
          }));

          // Callback
          if (onNewLead) {
            onNewLead(newLead);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leads',
        },
        (payload) => {
          const updatedLead = payload.new as Lead;

          // Update in list
          setLeads((prev) =>
            prev.map((lead) => (lead.id === updatedLead.id ? updatedLead : lead))
          );

          // If lead is now converted/lost, remove from list
          if (updatedLead.status === 'converted' || updatedLead.status === 'lost') {
            setLeads((prev) => prev.filter((lead) => lead.id !== updatedLead.id));
            // Refetch counts
            fetchLeads();
          }

          // Callback
          if (onLeadUpdate) {
            onLeadUpdate(updatedLead);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'leads',
        },
        (payload) => {
          const deletedLead = payload.old as { id: string };
          setLeads((prev) => prev.filter((lead) => lead.id !== deletedLead.id));
          // Refetch counts
          fetchLeads();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeConnected(true);
          stopPolling();
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setRealtimeConnected(false);
          // Fall back to polling
          startPolling();
        }
      });

    // Start polling as fallback until realtime connects
    startPolling();

    return () => {
      supabase.removeChannel(channel);
      stopPolling();
    };
  }, [
    fetchLeads,
    supabase,
    priorityColor,
    onNewLead,
    onLeadUpdate,
    startPolling,
    stopPolling,
  ]);

  return {
    leads,
    counts,
    pendingOutcome,
    loading,
    error,
    realtimeConnected,
    refetch: fetchLeads,
  };
}

/**
 * Hook for single lead with realtime updates
 */
export function useRealtimeLead(leadId: string) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchLead() {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('leads')
          .select('*')
          .eq('id', leadId)
          .single();

        if (fetchError) throw fetchError;
        setLead(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchLead();

    // Set up realtime subscription for this specific lead
    const channel = supabase
      .channel(`lead-${leadId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leads',
          filter: `id=eq.${leadId}`,
        },
        (payload) => {
          setLead(payload.new as Lead);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leadId, supabase]);

  return { lead, loading, error };
}
