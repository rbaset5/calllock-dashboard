'use client';

import { useState } from 'react';
import { Job } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  X,
  Clock,
  AlertTriangle,
  Loader2,
  CalendarClock,
  MessageSquare,
} from 'lucide-react';
import { format } from 'date-fns';
import { DatePicker, TimeSlotGrid, CustomerSummary } from '@/components/scheduling';
import { useCalendarSlotsWithDate } from '@/hooks/use-calendar-slots';

interface RescheduleModalProps {
  job: Job;
  timezone: string;
  onClose: () => void;
  onRescheduled: (job: Job) => void;
}

export function RescheduleModal({ job, timezone, onClose, onRescheduled }: RescheduleModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  // Use shared hook for slot management
  const { slots, loading: loadingSlots, error: slotsError, selectedSlot, setSelectedSlot } =
    useCalendarSlotsWithDate(selectedDate);

  // Format current appointment time
  const currentAppointment = job.scheduled_at
    ? format(new Date(job.scheduled_at), 'EEEE, MMMM d \'at\' h:mm a')
    : 'Not scheduled';

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

  const displayError = error || slotsError;

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
          <CustomerSummary
            name={job.customer_name}
            phone={job.customer_phone}
            address={job.customer_address}
            currentAppointment={currentAppointment}
          />

          {/* Date Picker */}
          <DatePicker
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            disabled={rescheduling}
            label="Select New Date"
          />

          {/* Time Slots */}
          {selectedDate && (
            <TimeSlotGrid
              slots={slots}
              selectedSlot={selectedSlot}
              onSelectSlot={setSelectedSlot}
              loading={loadingSlots}
              error={slotsError}
              disabled={rescheduling}
              label="Select New Time"
            />
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
          {displayError && !loadingSlots && slots.length > 0 && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span className="text-sm">{displayError}</span>
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
