import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import { DollarSign, TrendingUp, CheckCircle, Calendar } from 'lucide-react';
import { startOfMonth, subMonths, format } from 'date-fns';

export default async function ReportsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Get monthly data for the last 6 months
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(now, i);
    return {
      start: startOfMonth(date).toISOString(),
      end: startOfMonth(subMonths(date, -1)).toISOString(),
      label: format(date, 'MMM yyyy'),
    };
  }).reverse();

  // Fetch revenue data for each month
  const monthlyData = await Promise.all(
    months.map(async (month) => {
      const { data: jobs } = await supabase
        .from('jobs')
        .select('revenue')
        .eq('user_id', user.id)
        .eq('status', 'complete')
        .gte('completed_at', month.start)
        .lt('completed_at', month.end)
        .not('revenue', 'is', null);

      const revenue = (jobs || []).reduce((sum, job) => sum + (job.revenue || 0), 0);
      const count = jobs?.length || 0;

      return {
        label: month.label,
        revenue,
        count,
      };
    })
  );

  // Calculate totals
  const totalRevenue = monthlyData.reduce((sum, m) => sum + m.revenue, 0);
  const totalJobs = monthlyData.reduce((sum, m) => sum + m.count, 0);
  const avgPerJob = totalJobs > 0 ? totalRevenue / totalJobs : 0;

  // Get current month data
  const currentMonth = monthlyData[monthlyData.length - 1];
  const lastMonth = monthlyData[monthlyData.length - 2];
  const monthOverMonthChange = lastMonth.revenue > 0
    ? ((currentMonth.revenue - lastMonth.revenue) / lastMonth.revenue) * 100
    : 0;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Revenue Reports</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(totalRevenue)}
                </p>
                <p className="text-xs text-gray-500">6-Month Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{totalJobs}</p>
                <p className="text-xs text-gray-500">Jobs Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(avgPerJob)}
                </p>
                <p className="text-xs text-gray-500">Avg per Job</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className={`text-xl font-bold ${monthOverMonthChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {monthOverMonthChange >= 0 ? '+' : ''}{monthOverMonthChange.toFixed(0)}%
                </p>
                <p className="text-xs text-gray-500">vs Last Month</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-100">
            {[...monthlyData].reverse().map((month) => (
              <div
                key={month.label}
                className="flex items-center justify-between px-4 py-3"
              >
                <div>
                  <p className="font-medium text-gray-900">{month.label}</p>
                  <p className="text-sm text-gray-500">{month.count} jobs</p>
                </div>
                <p className="font-semibold text-gray-900">
                  {formatCurrency(month.revenue)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* CallSeal ROI */}
      <Card className="bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200">
        <CardContent className="p-6 text-center">
          <h3 className="text-lg font-semibold text-primary-900">CallSeal ROI</h3>
          <p className="text-4xl font-bold text-primary-600 mt-2">
            {formatCurrency(totalRevenue)}
          </p>
          <p className="text-sm text-primary-700 mt-1">
            rescued from missed calls over 6 months
          </p>
          <div className="mt-4 pt-4 border-t border-primary-200">
            <p className="text-sm text-primary-800">
              At $199/month, CallSeal has paid for itself{' '}
              <strong>{(totalRevenue / (199 * 6)).toFixed(1)}x</strong> over
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
