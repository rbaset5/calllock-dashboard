'use client';

import { useEffect, useState } from 'react';
import { PinContainer } from '@/components/ui/3d-pin';

interface DashboardStats {
  user: {
    email: string;
    business_name: string;
  };
  stats: {
    jobsToday: number;
    todayRevenue: number;
    weekRevenue: number;
    needsAction: number;
    upcomingThisWeek: number;
  };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/dashboard/stats');
        const result = await response.json();

        if (!response.ok) {
          setError(result.error || 'Failed to load dashboard');
          return;
        }

        setData(result);
      } catch (err) {
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="h-[calc(100vh-4rem)] w-full flex items-center justify-center bg-slate-950">
        <div className="animate-pulse">
          <div className="w-80 h-80 bg-slate-800 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[calc(100vh-4rem)] w-full flex items-center justify-center bg-slate-950">
        <div className="bg-red-950/50 border border-red-500/50 text-red-400 px-6 py-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { user, stats } = data;

  return (
    <div className="h-[calc(100vh-4rem)] w-full flex items-center justify-center bg-slate-950">
      <PinContainer title="View Today's Jobs" href="/today">
        <div className="flex flex-col p-4 tracking-tight text-slate-100/50 w-[20rem] h-[20rem] bg-gradient-to-b from-slate-800/50 to-slate-800/0 backdrop-blur-sm border border-slate-700/50 rounded-2xl">
          {/* Header */}
          <div className="flex items-center gap-2">
            <div className="size-3 rounded-full bg-emerald-500 animate-pulse" />
            <div className="text-xs text-slate-400">{user.business_name}</div>
          </div>

          {/* Content */}
          <div className="flex-1 mt-4 space-y-4">
            <div className="text-2xl font-bold text-slate-100">
              Today&apos;s Overview
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-3xl font-bold text-sky-400">{stats.jobsToday}</div>
                <div className="text-xs text-slate-400">Today&apos;s Jobs</div>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold text-emerald-400">
                  ${stats.todayRevenue.toLocaleString()}
                </div>
                <div className="text-xs text-slate-400">Est. Revenue</div>
              </div>
            </div>

            {/* Animated Waves */}
            <div className="relative h-20 overflow-hidden rounded-lg">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="absolute w-full h-20 animate-wave"
                  style={{
                    background: `linear-gradient(180deg, transparent 0%, rgba(59, 130, 246, 0.1) 50%, transparent 100%)`,
                    animationDelay: `${i * 0.5}s`,
                    opacity: 0.3 / i,
                    transform: `translateY(${i * 10}px)`,
                  }}
                />
              ))}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-end">
              <div className="text-xs text-slate-400">
                {stats.needsAction > 0
                  ? `${stats.needsAction} items need attention`
                  : 'All caught up!'
                }
              </div>
              <div className="text-sky-400 text-sm font-medium">
                View Jobs →
              </div>
            </div>
          </div>
        </div>
      </PinContainer>

      <style jsx>{`
        @keyframes wave {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        .animate-wave {
          animation: wave 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
