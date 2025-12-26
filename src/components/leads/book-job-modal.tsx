'use client';

import { useState, useMemo } from 'react';
import { Lead } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  X,
  Calendar,
  Clock,
  Loader2,
  Zap,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';
import { DatePicker, TimeSlotGrid, CustomerSummary } from '@/components/scheduling';
import { useCalendarSlotsWithDate } from '@/hooks/use-calendar-slots';
import {
  parseTimePreference,
  sortSlotsByPreference,
  generateDateRange,
} from '@/lib/scheduling';
import type { TimeSlot } from '@/lib/scheduling';

interface BookJobModalProps {
  lead: Lead;
  onClose: () => void;
  onBooked?: (jobId: string) => void;
  onSuccess?: () => void;
}

export function BookJobModal({ lead, onClose, onBooked, onSuccess }: BookJobModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [loadingAsap, setLoadingAsap] = useState(false);

  // Use shared hook for slot management
  const { slots, loading: loadingSlots, error: slotsError, selectedSlot, setSelectedSlot } =
    useCalendarSlotsWithDate(selectedDate);

  // Parse customer's time preference
  const timePreference = useMemo(
    () => parseTimePreference(lead.time_preference),
    [lead.time_preference]
  );

  // Sort slots by preference
  const sortedSlots = useMemo(() => {
    if (!timePreference.timeOfDay) return slots;
    return sortSlotsByPreference(slots, timePreference);
  }, [slots, timePreference]);

  // Handle ASAP booking - finds first available slot
  const handleAsapBook = async () => {
    setLoadingAsap(true);
    setBookingError(null);

    try {
      const dates = generateDateRange(7);

      for (const date of dates) {
        const dateStr = format(date, 'yyyy-MM-dd');
        const response = await fetch(`/api/calendar/availability?date=${dateStr}`);

        if (!response.ok) continue;

        const data = await response.json();
        if (data.slots?.length > 0) {
          const firstSlot = data.slots[0];
          setSelectedDate(date);
          setSelectedSlot(firstSlot);
          setLoadingAsap(false);
          await handleBookSlot(firstSlot);
          return;
        }
      }

      setBookingError('No available slots in the next 7 days. Please try manual selection.');
    } catch (err) {
      console.error('ASAP booking error:', err);
      setBookingError('Failed to find available slots. Please try again.');
    } finally {
      setLoadingAsap(false);
    }
  };

  // Book a specific slot
  const handleBookSlot = async (slot: TimeSlot) => {
    setBooking(true);
    setBookingError(null);

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
      setBookingError(err instanceof Error ? err.message : 'Failed to book job. Please try again.');
      setBooking(false);
    }
  };

  const handleBook = async () => {
    if (!selectedSlot) return;
    await handleBookSlot(selectedSlot);
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

  const error = bookingError || slotsError;

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
          <CustomerSummary
            name={lead.customer_name}
            phone={lead.customer_phone}
            address={lead.customer_address}
            issueDescription={lead.issue_description}
            estimatedValue={lead.estimated_value}
          />

          {/* Date Picker */}
          <DatePicker
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            disabled={booking}
          />

          {/* Time Slots */}
          {selectedDate && (
            <TimeSlotGrid
              slots={sortedSlots}
              selectedSlot={selectedSlot}
              onSelectSlot={setSelectedSlot}
              loading={loadingSlots}
              error={slotsError}
              disabled={booking || loadingAsap}
              columns={4}
              timePreference={timePreference}
              showPreferredHint={Boolean(timePreference.timeOfDay)}
            />
          )}

          {/* Error Display */}
          {error && !loadingSlots && slots.length > 0 && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <Clock className="w-5 h-5 shrink-0" />
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
