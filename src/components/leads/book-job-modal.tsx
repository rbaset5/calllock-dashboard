'use client';

import { useState, useEffect, useMemo } from 'react';
import { Lead } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  X,
  Calendar,
  Clock,
  User,
  Phone,
  MapPin,
  AlertTriangle,
  Loader2,
  DollarSign,
  Zap,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { format, addDays, startOfDay, isSameDay, isToday, isTomorrow, getHours } from 'date-fns';
import { cn } from '@/lib/utils';

interface TimeSlot {
  time: string;
  label: string;
  isoDateTime: string;
}

interface BookJobModalProps {
  lead: Lead;
  onClose: () => void;
  onBooked?: (jobId: string) => void;
  onSuccess?: () => void; // Alternative callback for outcome flow
}

// Time preference patterns to detect and highlight
type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'asap' | null;

function parseTimePreference(preference: string | null | undefined): {
  timeOfDay: TimeOfDay;
  specificDay: string | null;
  displayText: string | null;
} {
  if (!preference) return { timeOfDay: null, specificDay: null, displayText: null };

  const lower = preference.toLowerCase();

  // Check for urgency/ASAP
  if (
    lower.includes('asap') ||
    lower.includes('soon') ||
    lower.includes('emergency') ||
    lower.includes('urgent') ||
    lower.includes('today') ||
    lower.includes('right away')
  ) {
    return { timeOfDay: 'asap', specificDay: 'today', displayText: preference };
  }

  // Check for time of day
  let timeOfDay: TimeOfDay = null;
  if (lower.includes('morning') || lower.includes('am')) {
    timeOfDay = 'morning';
  } else if (lower.includes('afternoon')) {
    timeOfDay = 'afternoon';
  } else if (lower.includes('evening') || lower.includes('pm') || lower.includes('after work')) {
    timeOfDay = 'evening';
  }

  // Check for specific day
  let specificDay: string | null = null;
  if (lower.includes('tomorrow')) {
    specificDay = 'tomorrow';
  } else if (lower.includes('monday')) {
    specificDay = 'monday';
  } else if (lower.includes('tuesday')) {
    specificDay = 'tuesday';
  } else if (lower.includes('wednesday')) {
    specificDay = 'wednesday';
  } else if (lower.includes('thursday')) {
    specificDay = 'thursday';
  } else if (lower.includes('friday')) {
    specificDay = 'friday';
  } else if (lower.includes('saturday')) {
    specificDay = 'saturday';
  } else if (lower.includes('sunday')) {
    specificDay = 'sunday';
  } else if (lower.includes('weekend')) {
    specificDay = 'weekend';
  }

  return { timeOfDay, specificDay, displayText: preference };
}

function isSlotPreferred(slot: TimeSlot, preference: { timeOfDay: TimeOfDay }): boolean {
  if (!preference.timeOfDay || preference.timeOfDay === 'asap') return false;

  const hour = getHours(new Date(slot.isoDateTime));

  switch (preference.timeOfDay) {
    case 'morning':
      return hour >= 7 && hour < 12;
    case 'afternoon':
      return hour >= 12 && hour < 17;
    case 'evening':
      return hour >= 17 && hour < 21;
    default:
      return false;
  }
}

export function BookJobModal({ lead, onClose, onBooked, onSuccess }: BookJobModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [loadingAsap, setLoadingAsap] = useState(false);

  // Parse customer's time preference
  const timePreference = useMemo(
    () => parseTimePreference(lead.time_preference),
    [lead.time_preference]
  );

  // Generate next 7 days for date picker
  const today = startOfDay(new Date());
  const dates = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  // Sort slots: preferred times first, then chronologically
  const sortedSlots = useMemo(() => {
    if (!timePreference.timeOfDay) return slots;

    return [...slots].sort((a, b) => {
      const aPreferred = isSlotPreferred(a, timePreference);
      const bPreferred = isSlotPreferred(b, timePreference);

      if (aPreferred && !bPreferred) return -1;
      if (!aPreferred && bPreferred) return 1;
      return 0; // Keep original order otherwise
    });
  }, [slots, timePreference]);

  // Fetch slots when date changes
  useEffect(() => {
    if (!selectedDate) {
      setSlots([]);
      setSelectedSlot(null);
      return;
    }

    const fetchSlots = async () => {
      setLoadingSlots(true);
      setError(null);
      setSelectedSlot(null);

      try {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const response = await fetch(`/api/calendar/availability?date=${dateStr}`);

        if (!response.ok) {
          throw new Error('Failed to fetch availability');
        }

        const data = await response.json();
        setSlots(data.slots || []);

        if (data.slots?.length === 0) {
          setError('No available slots for this date. Try another day.');
        }
      } catch (err) {
        console.error('Error fetching slots:', err);
        setError('Failed to load available times. Please try again.');
        setSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [selectedDate]);

  // Handle ASAP booking - finds first available slot
  const handleAsapBook = async () => {
    setLoadingAsap(true);
    setError(null);

    try {
      // Try today first, then tomorrow, etc.
      for (const date of dates) {
        const dateStr = format(date, 'yyyy-MM-dd');
        const response = await fetch(`/api/calendar/availability?date=${dateStr}`);

        if (!response.ok) continue;

        const data = await response.json();
        if (data.slots?.length > 0) {
          // Found a slot! Book the first one
          const firstSlot = data.slots[0];
          setSelectedDate(date);
          setSelectedSlot(firstSlot);
          setLoadingAsap(false);
          // Auto-book it
          await handleBookSlot(firstSlot);
          return;
        }
      }

      // No slots found in the next 7 days
      setError('No available slots in the next 7 days. Please try manual selection.');
    } catch (err) {
      console.error('ASAP booking error:', err);
      setError('Failed to find available slots. Please try again.');
    } finally {
      setLoadingAsap(false);
    }
  };

  // Book a specific slot
  const handleBookSlot = async (slot: TimeSlot) => {
    setBooking(true);
    setError(null);

    try {
      // Step 1: Create Cal.com booking
      const bookResponse = await fetch('/api/calendar/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateTime: slot.isoDateTime,
          customerName: lead.customer_name,
          customerPhone: lead.customer_phone,
          serviceAddress: lead.customer_address || '',
          problemDescription: lead.issue_description || '',
          serviceType: lead.service_type,
          urgency: lead.urgency,
        }),
      });

      if (!bookResponse.ok) {
        const bookError = await bookResponse.json();
        throw new Error(bookError.error || 'Failed to create calendar booking');
      }

      const bookData = await bookResponse.json();

      // Step 2: Convert lead to job with booking UID
      const convertResponse = await fetch(`/api/leads/${lead.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduled_at: slot.isoDateTime,
          estimated_value: lead.estimated_value,
          cal_com_booking_uid: bookData.booking_uid,
        }),
      });

      if (!convertResponse.ok) {
        const convertError = await convertResponse.json();
        throw new Error(convertError.error || 'Failed to create job');
      }

      const convertData = await convertResponse.json();

      // Show success animation
      setBookingSuccess(true);

      // After animation, close modal
      setTimeout(() => {
        if (onBooked) {
          onBooked(convertData.job_id);
        }
        if (onSuccess) {
          onSuccess();
        }
      }, 1500);
    } catch (err) {
      console.error('Booking error:', err);
      setError(err instanceof Error ? err.message : 'Failed to book job. Please try again.');
      setBooking(false);
    }
  };

  const handleBook = async () => {
    if (!selectedSlot) return;
    await handleBookSlot(selectedSlot);
  };

  const formatDateLabel = (date: Date): string => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEE');
  };

  // Success state - show animation and auto-close
  if (bookingSuccess) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full sm:max-w-md p-8 text-center animate-in zoom-in-95">
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center animate-in zoom-in-50">
              <CheckCircle2 className="w-12 h-12 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-navy-800">Job Booked!</h3>
              <p className="text-gray-600 mt-1">
                {selectedSlot && selectedDate && (
                  <>
                    {format(selectedDate, 'EEEE, MMMM d')} at {selectedSlot.label}
                  </>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Sparkles className="w-4 h-4" />
              <span>Calendar updated</span>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <Card className="w-full sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col rounded-t-xl sm:rounded-xl animate-in slide-in-from-bottom-4">
        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b shrink-0">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-600" />
            Book Job
          </CardTitle>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full"
            disabled={booking || loadingAsap}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </CardHeader>

        <CardContent className="space-y-4 pt-4 overflow-y-auto flex-1">
          {/* Customer Time Preference Banner */}
          {timePreference.displayText && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Customer Preference</p>
                <p className="text-sm text-amber-700">&ldquo;{timePreference.displayText}&rdquo;</p>
              </div>
            </div>
          )}

          {/* ASAP Button */}
          <Button
            variant="outline"
            className="w-full h-14 border-2 border-primary-200 bg-primary-50 hover:bg-primary-100 text-primary-700"
            onClick={handleAsapBook}
            disabled={booking || loadingAsap}
          >
            {loadingAsap ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Finding next available...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5 mr-2" />
                ASAP - Next Available Slot
              </>
            )}
          </Button>

          <div className="flex items-center gap-3 text-gray-400">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs uppercase">or select a time</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Lead Summary */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-gray-400" />
              <span className="font-medium">{lead.customer_name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="w-4 h-4 text-gray-400" />
              <span>{lead.customer_phone}</span>
            </div>
            {lead.customer_address && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="truncate">{lead.customer_address}</span>
              </div>
            )}
            {lead.issue_description && (
              <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                {lead.issue_description}
              </p>
            )}
            {lead.estimated_value && (
              <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                <DollarSign className="w-4 h-4" />
                <span>Est. ${lead.estimated_value.toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Date Picker */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Select Date
            </label>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
              {dates.map((date) => {
                const isSelected = selectedDate && isSameDay(date, selectedDate);
                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => setSelectedDate(date)}
                    disabled={booking}
                    className={cn(
                      'flex flex-col items-center min-w-[60px] p-2 rounded-lg border-2 transition-colors',
                      isSelected
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
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

          {/* Time Slots */}
          {selectedDate && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Select Time
                {timePreference.timeOfDay && timePreference.timeOfDay !== 'asap' && (
                  <span className="ml-2 text-xs text-amber-600 font-normal">
                    ★ Preferred times highlighted
                  </span>
                )}
              </label>

              {loadingSlots ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                  <span className="ml-2 text-gray-500">Loading available times...</span>
                </div>
              ) : sortedSlots.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {sortedSlots.map((slot) => {
                    const isSelected = selectedSlot?.time === slot.time;
                    const isPreferred = isSlotPreferred(slot, timePreference);
                    return (
                      <button
                        key={slot.time}
                        onClick={() => setSelectedSlot(slot)}
                        disabled={booking || loadingAsap}
                        className={cn(
                          'p-2 rounded-lg border-2 text-sm font-medium transition-colors relative',
                          isSelected
                            ? 'border-navy-600 bg-navy-600 text-white'
                            : isPreferred
                              ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
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
              ) : error ? (
                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              ) : null}
            </div>
          )}

          {/* Error Display */}
          {error && !loadingSlots && slots.length > 0 && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </CardContent>

        {/* Footer Actions */}
        <div className="border-t p-4 space-y-2 shrink-0 bg-white">
          {selectedSlot && (
            <div className="text-center text-sm text-gray-600 mb-2">
              <Clock className="w-4 h-4 inline mr-1" />
              {format(selectedDate!, 'EEEE, MMMM d')} at {selectedSlot.label}
            </div>
          )}

          <Button
            className="w-full"
            onClick={handleBook}
            disabled={!selectedSlot || booking || loadingAsap}
          >
            {booking ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Booking...
              </>
            ) : (
              'Book Job'
            )}
          </Button>

          <Button
            variant="ghost"
            className="w-full"
            onClick={onClose}
            disabled={booking || loadingAsap}
          >
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  );
}
