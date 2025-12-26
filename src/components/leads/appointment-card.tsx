'use client';

import { Calendar, Clock, CalendarClock } from 'lucide-react';
import { formatScheduleTime } from '@/lib/format';
import { formatCountdown, getCountdownUrgency } from '@/lib/format-countdown';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AppointmentCardProps {
  scheduledAt: string | null;
  timezone?: string;
  onReschedule?: () => void;
  canReschedule?: boolean;
  isAiBooked?: boolean;
  className?: string;
}

/**
 * Prominent appointment time display with countdown
 * Designed for at-a-glance scheduling information
 */
export function AppointmentCard({
  scheduledAt,
  timezone = 'America/New_York',
  onReschedule,
  canReschedule = true,
  isAiBooked = false,
  className,
}: AppointmentCardProps) {
  if (!scheduledAt) return null;

  const countdown = formatCountdown(scheduledAt, timezone);
  const urgency = getCountdownUrgency(scheduledAt);
  const formattedTime = formatScheduleTime(scheduledAt, timezone);

  return (
    <div
      className={cn(
        'p-4 rounded-lg border',
        urgency === 'overdue' && 'bg-red-50 border-red-200',
        urgency === 'imminent' && 'bg-amber-50 border-amber-200',
        urgency === 'soon' && 'bg-blue-50 border-blue-200',
        urgency === 'scheduled' && 'bg-gray-50 border-gray-200',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Main Content */}
        <div className="flex items-start gap-3">
          {/* Calendar Icon */}
          <div
            className={cn(
              'flex items-center justify-center w-10 h-10 rounded-lg',
              urgency === 'overdue' && 'bg-red-100',
              urgency === 'imminent' && 'bg-amber-100',
              urgency === 'soon' && 'bg-blue-100',
              urgency === 'scheduled' && 'bg-gray-100'
            )}
          >
            <Calendar
              className={cn(
                'w-5 h-5',
                urgency === 'overdue' && 'text-red-600',
                urgency === 'imminent' && 'text-amber-600',
                urgency === 'soon' && 'text-blue-600',
                urgency === 'scheduled' && 'text-gray-600'
              )}
            />
          </div>

          {/* Time Details */}
          <div>
            <p className="text-lg font-semibold text-gray-900">
              {formattedTime}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              {/* Countdown Badge */}
              {countdown && (
                <CountdownBadge countdown={countdown} urgency={urgency} />
              )}

              {/* AI Booked Indicator */}
              {isAiBooked && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  AI Booked
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Reschedule Button */}
        {canReschedule && onReschedule && (
          <Button
            variant="outline"
            size="sm"
            onClick={onReschedule}
            className="shrink-0"
          >
            <CalendarClock className="w-4 h-4 mr-1" />
            Reschedule
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Countdown badge with urgency-based styling
 */
function CountdownBadge({
  countdown,
  urgency,
}: {
  countdown: string;
  urgency: ReturnType<typeof getCountdownUrgency>;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        urgency === 'overdue' && 'bg-red-100 text-red-700',
        urgency === 'imminent' && 'bg-amber-100 text-amber-700',
        urgency === 'soon' && 'bg-blue-100 text-blue-700',
        urgency === 'scheduled' && 'bg-gray-100 text-gray-600'
      )}
    >
      <Clock className="w-3 h-3" />
      {countdown}
    </span>
  );
}

/**
 * Compact inline appointment display for cards/lists
 */
export function AppointmentBadge({
  scheduledAt,
  timezone = 'America/New_York',
  isAiBooked = false,
}: {
  scheduledAt: string | null;
  timezone?: string;
  isAiBooked?: boolean;
}) {
  if (!scheduledAt) return null;

  const countdown = formatCountdown(scheduledAt, timezone);
  const urgency = getCountdownUrgency(scheduledAt);
  const formattedTime = formatScheduleTime(scheduledAt, timezone, { timeOnly: false });

  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium',
          urgency === 'overdue' && 'bg-red-100 text-red-700',
          urgency === 'imminent' && 'bg-amber-100 text-amber-700',
          urgency === 'soon' && 'bg-blue-100 text-blue-700',
          urgency === 'scheduled' && 'bg-gray-100 text-gray-700'
        )}
      >
        <Calendar className="w-3.5 h-3.5" />
        {formattedTime}
      </span>
      {countdown && (
        <span className="text-xs text-gray-500">
          ({countdown})
        </span>
      )}
      {isAiBooked && (
        <span className="text-xs text-green-600 font-medium">
          AI Booked
        </span>
      )}
    </div>
  );
}

export default AppointmentCard;
