'use client';

import { useState, useEffect } from 'react';
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
  ChevronLeft,
  ChevronRight,
  DollarSign,
} from 'lucide-react';
import { format, addDays, startOfDay, isSameDay, isToday, isTomorrow } from 'date-fns';
import { cn } from '@/lib/utils';

interface TimeSlot {
  time: string;
  label: string;
  isoDateTime: string;
}

interface BookJobModalProps {
  lead: Lead;
  onClose: () => void;
  onBooked: (jobId: string) => void;
}

export function BookJobModal({ lead, onClose, onBooked }: BookJobModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate next 7 days for date picker
  const today = startOfDay(new Date());
  const dates = Array.from({ length: 7 }, (_, i) => addDays(today, i));

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

  const handleBook = async () => {
    if (!selectedSlot) return;

    setBooking(true);
    setError(null);

    try {
      // Step 1: Create Cal.com booking
      const bookResponse = await fetch('/api/calendar/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateTime: selectedSlot.isoDateTime,
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
          scheduled_at: selectedSlot.isoDateTime,
          estimated_value: lead.estimated_value,
          cal_com_booking_uid: bookData.booking_uid,
        }),
      });

      if (!convertResponse.ok) {
        const convertError = await convertResponse.json();
        throw new Error(convertError.error || 'Failed to create job');
      }

      const convertData = await convertResponse.json();
      onBooked(convertData.job_id);
    } catch (err) {
      console.error('Booking error:', err);
      setError(err instanceof Error ? err.message : 'Failed to book job. Please try again.');
    } finally {
      setBooking(false);
    }
  };

  const formatDateLabel = (date: Date): string => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEE');
  };

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
            disabled={booking}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </CardHeader>

        <CardContent className="space-y-4 pt-4 overflow-y-auto flex-1">
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
              </label>

              {loadingSlots ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                  <span className="ml-2 text-gray-500">Loading available times...</span>
                </div>
              ) : slots.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {slots.map((slot) => {
                    const isSelected = selectedSlot?.time === slot.time;
                    return (
                      <button
                        key={slot.time}
                        onClick={() => setSelectedSlot(slot)}
                        disabled={booking}
                        className={cn(
                          'p-2 rounded-lg border-2 text-sm font-medium transition-colors',
                          isSelected
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        )}
                      >
                        {slot.label}
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
            disabled={!selectedSlot || booking}
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
            disabled={booking}
          >
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  );
}
