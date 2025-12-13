'use client';

import { useState } from 'react';
import { Job } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  X,
  Calendar,
  User,
  Phone,
  MapPin,
  AlertTriangle,
  Loader2,
  XCircle,
  MessageSquare,
} from 'lucide-react';
import { format } from 'date-fns';

interface CancelModalProps {
  job: Job;
  timezone: string;
  onClose: () => void;
  onCancelled: (job: Job) => void;
}

export function CancelModal({ job, timezone, onClose, onCancelled }: CancelModalProps) {
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  // Format current appointment time
  const currentAppointment = job.scheduled_at
    ? format(new Date(job.scheduled_at), 'EEEE, MMMM d \'at\' h:mm a')
    : 'Not scheduled';

  const hasCalComBooking = !!job.cal_com_booking_uid;

  const handleCancel = async () => {
    setCancelling(true);
    setError(null);

    try {
      const response = await fetch(`/api/jobs/${job.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: reason.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to cancel job');
      }

      onCancelled(data.job);
    } catch (err) {
      console.error('Cancel error:', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel. Please try again.');
      setCancelling(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <Card className="w-full sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col rounded-t-xl sm:rounded-xl animate-in slide-in-from-bottom-4">
        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b shrink-0">
          <CardTitle className="text-lg flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-600" />
            Cancel Job
          </CardTitle>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full"
            disabled={cancelling}
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
              <span>Scheduled: <span className="font-medium">{currentAppointment}</span></span>
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-3 text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Are you sure you want to cancel this job?</p>
              {hasCalComBooking ? (
                <p className="mt-1 text-amber-600">
                  This will also remove the appointment from the customer&apos;s calendar.
                </p>
              ) : (
                <p className="mt-1 text-amber-600">
                  This job does not have a linked calendar booking.
                </p>
              )}
            </div>
          </div>

          {/* Optional Reason */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-1">
              <MessageSquare className="w-4 h-4" />
              Reason (optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Customer requested cancellation, schedule conflict..."
              className="w-full p-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              rows={2}
              disabled={cancelling}
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </CardContent>

        {/* Footer Actions */}
        <div className="border-t p-4 space-y-2 shrink-0 bg-white">
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleCancel}
            disabled={cancelling}
          >
            {cancelling ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Cancelling...
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 mr-2" />
                Cancel Job
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            className="w-full"
            onClick={onClose}
            disabled={cancelling}
          >
            Keep Job
          </Button>
        </div>
      </Card>
    </div>
  );
}
