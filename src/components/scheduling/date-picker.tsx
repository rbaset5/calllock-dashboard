'use client';

import { useMemo } from 'react';
import { format, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { generateDateRange, formatDateLabel } from '@/lib/scheduling/utils';

interface DatePickerProps {
  /** Currently selected date */
  selectedDate: Date | null;
  /** Called when a date is selected */
  onSelectDate: (date: Date) => void;
  /** Number of days to show (default: 7) */
  days?: number;
  /** Whether the picker is disabled */
  disabled?: boolean;
  /** Label for the picker */
  label?: string;
}

export function DatePicker({
  selectedDate,
  onSelectDate,
  days = 7,
  disabled = false,
  label = 'Select Date',
}: DatePickerProps) {
  const dates = useMemo(() => generateDateRange(days), [days]);

  return (
    <div>
      <label className="text-sm font-medium text-gray-700 mb-2 block">
        {label}
      </label>
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {dates.map((date) => {
          const isSelected = selectedDate && isSameDay(date, selectedDate);
          return (
            <button
              key={date.toISOString()}
              onClick={() => onSelectDate(date)}
              disabled={disabled}
              className={cn(
                'flex flex-col items-center min-w-[60px] p-2 rounded-lg border-2 transition-colors',
                isSelected
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <span className="text-xs font-medium">
                {formatDateLabel(date)}
              </span>
              <span className="text-lg font-semibold">
                {format(date, 'd')}
              </span>
              <span className="text-xs text-gray-500">
                {format(date, 'MMM')}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
