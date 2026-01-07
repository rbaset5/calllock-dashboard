'use client';

import { useState, useEffect, useCallback } from 'react';
import { Job } from '@/types/database';
import { BookedResponse } from '@/app/api/booked/route';
import { format, parseISO } from 'date-fns';

interface JobGroup {
  label: string;
  date: string;
  jobs: Job[];
}

function formatJobTime(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'h:mm a');
  } catch {
    return '';
  }
}

function getShortAddress(address: string | null): string {
  if (!address) return 'Address pending';
  const parts = address.split(',');
  return parts[0].trim();
}

function extractProblem(summary: string | null): string {
  if (!summary) return 'Service call';
  const firstSentence = summary.split(/[.!?]/)[0].trim();
  return firstSentence.length > 40 ? firstSentence.slice(0, 40) + '...' : firstSentence;
}

function ScheduleJobCard({
  job,
  onNavigate,
  onCall,
}: {
  job: Job;
  onNavigate: (address: string) => void;
  onCall: (phone: string) => void;
}) {
  const jobTime = job.scheduled_at ? formatJobTime(job.scheduled_at) : '';

  return (
    <article className="bg-white rounded-xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)] overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-slate-900">{jobTime}</span>
            {job.is_ai_booked && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">
                <span className="material-symbols-outlined text-[12px]">auto_awesome</span>
                AI
              </span>
            )}
          </div>
        </div>

        <h3 className="font-bold text-slate-800 mb-1">{job.customer_name}</h3>
        <p className="text-slate-500 text-sm mb-2">{extractProblem(job.ai_summary)}</p>
        <p className="text-slate-400 text-sm">{getShortAddress(job.customer_address)}</p>

        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
          <button
            onClick={() => onNavigate(job.customer_address)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-sm transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">directions</span>
            Navigate
          </button>
          <button
            onClick={() => onCall(job.customer_phone)}
            className="flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-sm transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">call</span>
          </button>
        </div>
      </div>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
        <span className="material-symbols-outlined text-slate-400 text-4xl">
          calendar_month
        </span>
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-2">No Upcoming Jobs</h3>
      <p className="text-slate-500 text-sm max-w-[240px]">
        When you book appointments, they&apos;ll appear here.
      </p>
    </div>
  );
}

export default function SchedulePage() {
  const [data, setData] = useState<BookedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/booked');
      if (!response.ok) throw new Error('Failed to fetch');

      const result: BookedResponse = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      console.error('Error fetching schedule:', err);
      setError('Unable to load schedule');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleNavigate = (address: string) => {
    const encoded = encodeURIComponent(address);
    window.open(`https://maps.google.com/maps?daddr=${encoded}`, '_blank');
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  if (loading) {
    return (
      <main className="flex flex-col max-w-lg mx-auto w-full px-4 pt-4 gap-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded w-24" />
          <div className="h-32 bg-slate-200 rounded" />
          <div className="h-32 bg-slate-200 rounded" />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex flex-col max-w-lg mx-auto w-full px-4 pt-4 gap-6">
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-primary text-white rounded-lg font-medium"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  const groups = data?.groups || [];

  const todayGroup = groups.find((g) => g.label === 'Today');
  const tomorrowGroup = groups.find((g) => g.label === 'Tomorrow');
  const otherGroups = groups.filter((g) => g.label !== 'Today' && g.label !== 'Tomorrow');
  const thisWeekCount = otherGroups.reduce((sum, g) => sum + g.jobs.length, 0);

  return (
    <main className="flex flex-col max-w-lg mx-auto w-full px-4 pt-4 gap-6 pb-8">
      {groups.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {todayGroup && todayGroup.jobs.length > 0 && (
            <section>
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-3">
                Today ({todayGroup.jobs.length})
              </h2>
              <div className="space-y-3">
                {todayGroup.jobs.map((job) => (
                  <ScheduleJobCard
                    key={job.id}
                    job={job}
                    onNavigate={handleNavigate}
                    onCall={handleCall}
                  />
                ))}
              </div>
            </section>
          )}

          {tomorrowGroup && tomorrowGroup.jobs.length > 0 && (
            <section>
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-3">
                Tomorrow ({tomorrowGroup.jobs.length})
              </h2>
              <div className="space-y-3">
                {tomorrowGroup.jobs.map((job) => (
                  <ScheduleJobCard
                    key={job.id}
                    job={job}
                    onNavigate={handleNavigate}
                    onCall={handleCall}
                  />
                ))}
              </div>
            </section>
          )}

          {thisWeekCount > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wide">
                  This Week
                </h2>
                <span className="text-sm text-slate-400">{thisWeekCount} more</span>
              </div>
              <div className="space-y-4">
                {otherGroups.map((group) => (
                  <div key={group.date}>
                    <p className="text-xs font-semibold text-slate-500 mb-2 pl-1">
                      {group.label}
                    </p>
                    <div className="space-y-3">
                      {group.jobs.map((job) => (
                        <ScheduleJobCard
                          key={job.id}
                          job={job}
                          onNavigate={handleNavigate}
                          onCall={handleCall}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
