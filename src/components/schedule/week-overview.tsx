'use client';

import { DaySummary } from '@/app/api/schedule/route';
import { cn } from '@/lib/utils';
import { isToday, parseISO } from 'date-fns';

interface WeekOverviewProps {
  days: DaySummary[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}

function getCapacityLevel(jobCount: number): number {
  // 0 = empty, 1 = light, 2 = medium, 3 = full
  if (jobCount === 0) return 0;
  if (jobCount <= 2) return 1;
  if (jobCount <= 4) return 2;
  return 3;
}

function getCapacityColor(level: number): string {
  switch (level) {
    case 0: return 'bg-gray-100';
    case 1: return 'bg-green-200';
    case 2: return 'bg-green-400';
    case 3: return 'bg-green-600';
    default: return 'bg-gray-100';
  }
}

export function WeekOverview({ days, selectedDate, onSelectDate }: WeekOverviewProps) {
  return (
    <div className="bg-white rounded-lg border p-3">
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const isSelected = selectedDate === day.date;
          const isTodayDate = isToday(parseISO(day.date));
          const capacityLevel = getCapacityLevel(day.jobCount);

          return (
            <button
              key={day.date}
              onClick={() => onSelectDate(day.date)}
              className={cn(
                'flex flex-col items-center py-2 px-1 rounded-lg transition-all',
                isSelected
                  ? 'bg-primary-100 ring-2 ring-primary-500'
                  : 'hover:bg-gray-50',
                isTodayDate && !isSelected && 'ring-1 ring-primary-300'
              )}
            >
              {/* Day of week */}
              <span className={cn(
                'text-xs font-medium',
                isSelected ? 'text-primary-700' : 'text-gray-500'
              )}>
                {day.dayOfWeek}
              </span>

              {/* Day number */}
              <span className={cn(
                'text-lg font-semibold mt-0.5',
                isSelected ? 'text-primary-700' : 'text-gray-900',
                isTodayDate && 'text-primary-600'
              )}>
                {day.dayOfMonth}
              </span>

              {/* Capacity bar */}
              <div className="w-full mt-2 space-y-0.5">
                <div className={cn(
                  'h-1.5 rounded-full transition-all',
                  getCapacityColor(capacityLevel)
                )} />
              </div>

              {/* Job count */}
              <span className={cn(
                'text-xs mt-1',
                day.jobCount > 0 ? 'text-gray-700' : 'text-gray-400'
              )}>
                {day.jobCount}
              </span>

              {/* Pending review indicator */}
              {day.pendingReviewCount > 0 && (
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-1" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
