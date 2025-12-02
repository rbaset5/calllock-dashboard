'use client';

import { DollarSign, TrendingUp, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';

interface RevenueCardProps {
  totalRevenue: number;
  jobsCompleted: number;
  previousMonthRevenue?: number;
}

export function RevenueCard({ totalRevenue, jobsCompleted, previousMonthRevenue }: RevenueCardProps) {
  const percentChange = previousMonthRevenue
    ? ((totalRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
    : null;

  return (
    <Card className="bg-gradient-to-br from-primary-600 to-primary-700 text-white">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-primary-100 text-sm font-medium">Rescued Revenue (This Month)</p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(totalRevenue)}</p>
            <div className="flex items-center gap-4 mt-3">
              <span className="flex items-center gap-1 text-sm text-primary-100">
                <CheckCircle className="w-4 h-4" />
                {jobsCompleted} jobs completed
              </span>
              {percentChange !== null && (
                <span className="flex items-center gap-1 text-sm text-primary-100">
                  <TrendingUp className="w-4 h-4" />
                  {percentChange > 0 ? '+' : ''}{percentChange.toFixed(0)}% vs last month
                </span>
              )}
            </div>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
