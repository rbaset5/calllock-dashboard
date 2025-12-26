'use client';

/**
 * Empty States for Velocity Triage
 *
 * Archetype-specific empty states with contextual messaging.
 */

import Link from 'next/link';
import { CheckCircle, TrendingUp, Heart, Calendar, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  className?: string;
}

/**
 * HAZARD Empty - Calm, reassuring
 */
export function HazardEmptyState({ className }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}>
      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
        <CheckCircle className="h-6 w-6 text-green-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        No emergencies right now
      </h3>
      <p className="text-sm text-gray-500">
        All customers are safe
      </p>
    </div>
  );
}

/**
 * REVENUE Empty - Prompts action
 */
export function RevenueEmptyState({ className }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}>
      <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4">
        <TrendingUp className="h-6 w-6 text-amber-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        No hot leads today
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        Follow up on recent quotes?
      </p>
      <Link href="/history?filter=quoted">
        <Button variant="outline" size="sm">
          View Recent Quotes
        </Button>
      </Link>
    </div>
  );
}

/**
 * RECOVERY Empty - Positive reinforcement
 */
export function RecoveryEmptyState({ className }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}>
      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
        <Heart className="h-6 w-6 text-green-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        All customers happy
      </h3>
      <p className="text-sm text-gray-500">
        No callback risks detected
      </p>
    </div>
  );
}

/**
 * LOGISTICS Empty - Simple completion
 */
export function LogisticsEmptyState({ className }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}>
      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
        <Calendar className="h-6 w-6 text-blue-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        Caught up on scheduling
      </h3>
      <p className="text-sm text-gray-500">
        No pending appointments to book
      </p>
    </div>
  );
}

/**
 * ALL Empty - Inbox zero celebration
 */
interface AllEmptyStateProps extends EmptyStateProps {
  todayStats?: {
    total_calls?: number;
    ai_booked?: number;
  };
}

export function AllEmptyState({ todayStats, className }: AllEmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}>
      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center mb-4">
        <Sparkles className="h-7 w-7 text-amber-500" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-1">
        Inbox zero!
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        All leads handled for now
      </p>
      {todayStats && (todayStats.ai_booked || 0) > 0 && (
        <div className="flex items-center gap-1 text-sm text-emerald-600">
          <CheckCircle className="h-4 w-4" />
          <span>{todayStats.ai_booked} appointments booked by AI today</span>
        </div>
      )}
    </div>
  );
}

/**
 * Get the appropriate empty state component for a given filter
 */
export function getEmptyStateForFilter(
  filter: 'all' | 'HAZARD' | 'REVENUE' | 'RECOVERY' | 'LOGISTICS',
  todayStats?: { total_calls?: number; ai_booked?: number }
) {
  switch (filter) {
    case 'HAZARD':
      return <HazardEmptyState />;
    case 'REVENUE':
      return <RevenueEmptyState />;
    case 'RECOVERY':
      return <RecoveryEmptyState />;
    case 'LOGISTICS':
      return <LogisticsEmptyState />;
    case 'all':
    default:
      return <AllEmptyState todayStats={todayStats} />;
  }
}
