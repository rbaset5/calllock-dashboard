'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import type { TimeSlot } from '@/lib/scheduling/types';

interface UseCalendarSlotsOptions {
  /** Called when slots are fetched */
  onSlotsLoaded?: (slots: TimeSlot[]) => void;
}

interface UseCalendarSlotsReturn {
  /** Currently fetched slots */
  slots: TimeSlot[];
  /** Whether slots are being loaded */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Currently selected slot */
  selectedSlot: TimeSlot | null;
  /** Select a slot */
  setSelectedSlot: (slot: TimeSlot | null) => void;
  /** Fetch slots for a specific date */
  fetchSlotsForDate: (date: Date) => Promise<void>;
  /** Clear all state */
  reset: () => void;
}

/**
 * Hook for fetching and managing calendar time slots
 */
export function useCalendarSlots(options: UseCalendarSlotsOptions = {}): UseCalendarSlotsReturn {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  const fetchSlotsForDate = useCallback(async (date: Date) => {
    setLoading(true);
    setError(null);
    setSelectedSlot(null);

    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const response = await fetch(`/api/calendar/availability?date=${dateStr}`);

      if (!response.ok) {
        throw new Error('Failed to fetch availability');
      }

      const data = await response.json();
      const fetchedSlots = data.slots || [];
      setSlots(fetchedSlots);

      if (fetchedSlots.length === 0) {
        setError('No available slots for this date. Try another day.');
      }

      options.onSlotsLoaded?.(fetchedSlots);
    } catch (err) {
      console.error('Error fetching slots:', err);
      setError('Failed to load available times. Please try again.');
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [options]);

  const reset = useCallback(() => {
    setSlots([]);
    setLoading(false);
    setError(null);
    setSelectedSlot(null);
  }, []);

  return {
    slots,
    loading,
    error,
    selectedSlot,
    setSelectedSlot,
    fetchSlotsForDate,
    reset,
  };
}

/**
 * Hook that automatically fetches slots when selected date changes
 */
export function useCalendarSlotsWithDate(
  selectedDate: Date | null,
  options: UseCalendarSlotsOptions = {}
): Omit<UseCalendarSlotsReturn, 'fetchSlotsForDate'> {
  const { slots, loading, error, selectedSlot, setSelectedSlot, fetchSlotsForDate, reset } =
    useCalendarSlots(options);

  useEffect(() => {
    if (!selectedDate) {
      reset();
      return;
    }

    fetchSlotsForDate(selectedDate);
  }, [selectedDate, fetchSlotsForDate, reset]);

  return {
    slots,
    loading,
    error,
    selectedSlot,
    setSelectedSlot,
    reset,
  };
}
