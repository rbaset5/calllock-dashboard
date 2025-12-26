'use client';

import { useMemo } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TimeSlot, TimeOfDay } from '@/lib/scheduling/types';
import { isSlotPreferred, sortSlotsByPreference } from '@/lib/scheduling/utils';

interface TimeSlotGridProps {
  /** Available time slots */
  slots: TimeSlot[];
  /** Currently selected slot */
  selectedSlot: TimeSlot | null;
  /** Called when a slot is selected */
  onSelectSlot: (slot: TimeSlot) => void;
  /** Whether slots are loading */
  loading?: boolean;
  /** Error message to display */
  error?: string | null;
  /** Whether the grid is disabled */
  disabled?: boolean;
  /** Label for the grid */
  label?: string;
  /** Number of columns (default: 3) */
  columns?: 3 | 4;
  /** Customer's time preference for highlighting */
  timePreference?: { timeOfDay: TimeOfDay };
  /** Whether to show preferred time hint */
  showPreferredHint?: boolean;
}

export function TimeSlotGrid({
  slots,
  selectedSlot,
  onSelectSlot,
  loading = false,
  error = null,
  disabled = false,
  label = 'Select Time',
  columns = 3,
  timePreference,
  showPreferredHint = false,
}: TimeSlotGridProps) {
  // Sort slots by preference if timePreference is provided
  const sortedSlots = useMemo(() => {
    if (!timePreference?.timeOfDay) return slots;
    return sortSlotsByPreference(slots, timePreference);
  }, [slots, timePreference]);

  const showPreferredLabel =
    showPreferredHint &&
    timePreference?.timeOfDay &&
    timePreference.timeOfDay !== 'asap';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
        <span className="ml-2 text-gray-500">Loading available times...</span>
      </div>
    );
  }

  if (slots.length === 0 && error) {
    return (
      <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
        <AlertTriangle className="w-5 h-5 shrink-0" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  if (slots.length === 0) {
    return null;
  }

  return (
    <div>
      <label className="text-sm font-medium text-gray-700 mb-2 block">
        {label}
        {showPreferredLabel && (
          <span className="ml-2 text-xs text-amber-600 font-normal">
            ★ Preferred times highlighted
          </span>
        )}
      </label>

      <div className={cn(
        'grid gap-2',
        columns === 4 ? 'grid-cols-4' : 'grid-cols-3'
      )}>
        {sortedSlots.map((slot) => {
          const isSelected = selectedSlot?.time === slot.time;
          const isPreferred = timePreference ? isSlotPreferred(slot, timePreference) : false;

          return (
            <button
              key={slot.time}
              onClick={() => onSelectSlot(slot)}
              disabled={disabled}
              className={cn(
                'p-2 rounded-lg border-2 text-sm font-medium transition-colors relative',
                isSelected
                  ? 'border-navy-600 bg-navy-600 text-white'
                  : isPreferred
                    ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {slot.label}
              {isPreferred && !isSelected && (
                <span className="absolute -top-1 -right-1 text-amber-500 text-xs">★</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
