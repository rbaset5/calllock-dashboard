'use client';

import { useState, useEffect } from 'react';
import { Job } from '@/types/database';
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
  CalendarClock,
  MessageSquare,
} from 'lucide-react';
import { format, addDays, startOfDay, isSameDay, isToday, isTomorrow } from 'date-fns';
import { cn } from '@/lib/utils';

interface TimeSlot {
  time: string;
  label: string;
  isoDateTime: string;
}

interface RescheduleModalProps {
  job: Job;
  timezone: string;
  onClose: () => void;
  onRescheduled: (job: Job) => void;
}

export function RescheduleModal({ job, timezone, onClose, onRescheduled }: RescheduleModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  // Generate next 7 days for date picker
  const today = startOfDay(new Date());
  const dates = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  // Format current appointment time
  const currentAppointment = job.scheduled_at
    ? format(new Date(job.scheduled_at), 'EEEE, MMMM d \'at\' h:mm a')
    : 'Not scheduled';

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

  const handleReschedule = async () => {
    if (!selectedSlot) return;

    setRescheduling(true);
    setError(null);

    try {
      const response = await fetch(`/api/jobs/${job.id}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newDateTime: selectedSlot.isoDateTime,
          reason: reason.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to reschedule job');
      }

      onRescheduled(data.job);
    } catch (err) {
      console.error('Reschedule error:', err);
      setError(err instanceof Error ? err.message : 'Failed to reschedule. Please try again.');
    } finally {
      setRescheduling(false);
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
            <CalendarClock className="w-5 h-5 text-primary-600" />
            Reschedule Job
          </CardTitle>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full"
            disabled={rescheduling}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </CardHeader>

        <CardContent className="space-y-4 pt-4 overflow-y-auto flex-1">
          {/* Job Summary */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-gray-400" />
              <span className="font-medium">{job.customer_name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="w-4 h-4 text-gray-400" />
              <span>{job.customer_phone}</span>
            </div>
            {job.customer_address && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="truncate">{job.customer_address}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-600 pt-1 border-t mt-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>Currently scheduled: <span className="font-medium">{currentAppointment}</span></span>
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Select New Date
            </label>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
              {dates.map((date) => {
                const isSelected = selectedDate && isSameDay(date, selectedDate);
                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => setSelectedDate(date)}
                    disabled={rescheduling}
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
                Select New Time
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
                        disabled={rescheduling}
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

          {/* Optional Reason */}
          {selectedSlot && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-1">
                <MessageSquare className="w-4 h-4" />
                Reason (optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Customer requested a different time..."
                className="w-full p-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                rows={2}
                disabled={rescheduling}
              />
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
              New time: {format(selectedDate!, 'EEEE, MMMM d')} at {selectedSlot.label}
            </div>
          )}

          <Button
            className="w-full"
            onClick={handleReschedule}
            disabled={!selectedSlot || rescheduling}
          >
            {rescheduling ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Rescheduling...
              </>
            ) : (
              'Confirm Reschedule'
            )}
          </Button>

          <Button
            variant="ghost"
            className="w-full"
            onClick={onClose}
            disabled={rescheduling}
          >
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  );
}
