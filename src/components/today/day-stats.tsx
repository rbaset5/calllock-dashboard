'use client';

import { DollarSign, CheckCircle, Calendar, TrendingUp } from 'lucide-react';

interface DayStatsProps {
  totalJobs: number;
  completedJobs: number;
  estimatedRevenue: number;
  actualRevenue: number;
}

export function DayStats({ totalJobs, completedJobs, estimatedRevenue, actualRevenue }: DayStatsProps) {
  const remainingJobs = totalJobs - completedJobs;
  const remainingRevenue = estimatedRevenue - actualRevenue;

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between">
        {/* Revenue Section */}
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-gray-900">
              ${actualRevenue.toLocaleString()}
            </span>
            {remainingRevenue > 0 && (
              <span className="text-sm text-gray-500">
                + ${remainingRevenue.toLocaleString()} est.
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Today&apos;s revenue</p>
        </div>

        {/* Jobs Progress */}
        <div className="text-right">
          <div className="flex items-center gap-1.5 justify-end">
            <span className="text-lg font-semibold text-gray-900">
              {completedJobs}/{totalJobs}
            </span>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {remainingJobs === 0
              ? 'All done!'
              : `${remainingJobs} remaining`}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      {totalJobs > 0 && (
        <div className="mt-3">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${(completedJobs / totalJobs) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
