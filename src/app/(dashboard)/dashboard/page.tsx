'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Briefcase, DollarSign, AlertTriangle } from 'lucide-react';

interface DashboardStats {
  user: {
    email: string;
    business_name: string;
  };
  stats: {
    jobsToday: number;
    weekRevenue: number;
    needsAction: number;
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
      <div className="p-4 lg:p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="h-32 bg-gray-200 rounded-lg"></div>
            <div className="h-32 bg-gray-200 rounded-lg"></div>
            <div className="h-32 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 lg:p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { user, stats } = data;

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {user.business_name}!</h1>
        <p className="text-gray-600">Logged in as {user.email}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/jobs" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition">
          <div className="flex items-center gap-3 mb-2">
            <Briefcase className="w-5 h-5 text-primary-600" />
            <h3 className="font-semibold text-gray-900">Jobs Today</h3>
          </div>
          <p className="text-3xl font-bold text-primary-600">{stats.jobsToday}</p>
          <p className="text-sm text-gray-500">
            {stats.jobsToday === 0 ? 'No jobs scheduled' : stats.jobsToday === 1 ? '1 job scheduled' : `${stats.jobsToday} jobs scheduled`}
          </p>
        </Link>

        <Link href="/reports" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-gray-900">This Week</h3>
          </div>
          <p className="text-3xl font-bold text-green-600">
            ${stats.weekRevenue.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500">Revenue</p>
        </Link>

        <Link href="/jobs?needs_action=true" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className={`w-5 h-5 ${stats.needsAction > 0 ? 'text-orange-600' : 'text-gray-400'}`} />
            <h3 className="font-semibold text-gray-900">Needs Action</h3>
          </div>
          <p className={`text-3xl font-bold ${stats.needsAction > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
            {stats.needsAction}
          </p>
          <p className="text-sm text-gray-500">
            {stats.needsAction === 0 ? 'All caught up!' : 'Jobs requiring attention'}
          </p>
        </Link>
      </div>
    </div>
  );
}
