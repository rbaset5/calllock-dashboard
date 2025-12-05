'use client';

import { Briefcase, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

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
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    {
      label: 'Needs Action',
      value: needsActionCount,
      icon: AlertTriangle,
      color: needsActionCount > 0 ? 'text-red-600' : 'text-gray-600',
      bg: needsActionCount > 0 ? 'bg-red-100' : 'bg-gray-100',
    },
    {
      label: 'Completed',
      value: completedThisWeek,
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-100',
    },
    {
      label: 'Completion Rate',
      value: `${completionRate}%`,
      icon: Clock,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
