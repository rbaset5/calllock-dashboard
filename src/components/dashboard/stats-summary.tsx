'use client';

import { Briefcase, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';

interface StatsSummaryProps {
  jobsThisWeek: number;
  needsActionCount: number;
  completedThisWeek: number;
  completionRate: number;
}

export function StatsSummary({
  jobsThisWeek,
  needsActionCount,
  completedThisWeek,
  completionRate,
}: StatsSummaryProps) {
  const stats = [
    {
      label: 'Jobs This Week',
      value: jobsThisWeek,
      icon: Briefcase,
      iconColor: 'text-blue-600',
    },
    {
      label: 'Needs Action',
      value: needsActionCount,
      icon: AlertTriangle,
      iconColor: needsActionCount > 0 ? 'text-amber-500' : 'text-gray-400',
    },
    {
      label: 'Completed',
      value: completedThisWeek,
      icon: CheckCircle,
      iconColor: 'text-green-600',
    },
    {
      label: 'Completion Rate',
      value: `${completionRate}%`,
      icon: TrendingUp,
      iconColor: 'text-purple-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"
          >
            <div className="flex items-start justify-between mb-2">
              <Icon className={`w-5 h-5 ${stat.iconColor}`} />
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
            <p className="text-sm text-gray-500">{stat.label}</p>
          </div>
        );
      })}
    </div>
  );
}
