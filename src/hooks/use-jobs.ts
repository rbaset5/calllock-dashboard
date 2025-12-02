'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Job } from '@/types/database';

interface UseJobsOptions {
  status?: string;
  needsAction?: boolean;
  limit?: number;
}

export function useJobs(options: UseJobsOptions = {}) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (options.status) {
        query = query.eq('status', options.status);
      }

      if (options.needsAction) {
        query = query.eq('needs_action', true);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setJobs(data || []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [supabase, options.status, options.needsAction, options.limit]);

  useEffect(() => {
    fetchJobs();

    // Set up realtime subscription
    const channel = supabase
      .channel('jobs-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newJob = payload.new as Job;
            setJobs((prev) => [newJob, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedJob = payload.new as Job;
            setJobs((prev) =>
              prev.map((job) => (job.id === updatedJob.id ? updatedJob : job))
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedJob = payload.old as { id: string };
            setJobs((prev) => prev.filter((job) => job.id !== deletedJob.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchJobs, supabase]);

  return { jobs, loading, error, refetch: fetchJobs };
}

// Hook for single job with realtime updates
export function useJob(jobId: string) {
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchJob() {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', jobId)
          .single();

        if (fetchError) throw fetchError;
        setJob(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchJob();

    // Set up realtime subscription for this specific job
    const channel = supabase
      .channel(`job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs',
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          setJob(payload.new as Job);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId, supabase]);

  return { job, loading, error };
}
