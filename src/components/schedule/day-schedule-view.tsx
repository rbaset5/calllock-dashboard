'use client';

import { TimeSlot } from '@/app/api/schedule/day/[date]/route';
import { Job } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { UrgencyBadge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, Phone, Bot, Check, X, Edit } from 'lucide-react';
import Link from 'next/link';

interface DayScheduleViewProps {
  date: string;
  dateDisplay: string;
  timeSlots: TimeSlot[];
  totalEstimatedRevenue: number;
  availableSlotCount: number;
  timezone: string;
  onConfirmBooking?: (reviewId: string) => void;
  onAdjustBooking?: (reviewId: string) => void;
  onCancelBooking?: (reviewId: string) => void;
}

function TimeSlotRow({ slot, timezone, onConfirmBooking, onAdjustBooking, onCancelBooking }: {
  slot: TimeSlot;
  timezone: string;
  onConfirmBooking?: (reviewId: string) => void;
  onAdjustBooking?: (reviewId: string) => void;
  onCancelBooking?: (reviewId: string) => void;
}) {
  const { time, job, isAvailable, pendingReview } = slot;

  // AI Booking pending review
  if (pendingReview && job) {
    return (
      <div className="flex gap-3 py-3 border-b last:border-b-0">
        <div className="w-16 text-sm text-gray-500 pt-1 flex-shrink-0">
          {time}
        </div>
        <Card className="flex-1 border-blue-200 bg-blue-50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-700 uppercase">AI Booked - Review</span>
            </div>
            <Link href={`/jobs/${job.id}`}>
              <h4 className="font-medium text-gray-900">{job.customer_name}</h4>
              <p className="text-sm text-gray-600 mt-0.5">{job.ai_summary || 'HVAC Service'}</p>
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {job.customer_address}
              </p>
            </Link>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => onConfirmBooking?.(pendingReview.id)}
              >
                <Check className="w-4 h-4 mr-1" />
                Confirm
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAdjustBooking?.(pendingReview.id)}
              >
                <Edit className="w-4 h-4 mr-1" />
                Adjust
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => onCancelBooking?.(pendingReview.id)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Regular booked job
  if (job) {
    return (
      <div className="flex gap-3 py-3 border-b last:border-b-0">
        <div className="w-16 text-sm text-gray-500 pt-1 flex-shrink-0">
          {time}
        </div>
        <Link href={`/jobs/${job.id}`} className="flex-1">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">{job.customer_name}</h4>
                  <p className="text-sm text-gray-600 mt-0.5">{job.ai_summary || 'HVAC Service'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={job.status} />
                  {job.estimated_value && (
                    <span className="text-sm font-medium text-green-700">
                      ${job.estimated_value.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {job.customer_address.split(',')[0]}
                </span>
                <UrgencyBadge urgency={job.urgency} />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    );
  }

  // Available slot
  return (
    <div className="flex gap-3 py-3 border-b last:border-b-0">
      <div className="w-16 text-sm text-gray-400 pt-1 flex-shrink-0">
        {time}
      </div>
      <div className="flex-1 border border-dashed border-gray-200 rounded-lg p-3 text-center text-sm text-gray-400">
        Available
      </div>
    </div>
  );
}

export function DayScheduleView({
  date,
  dateDisplay,
  timeSlots,
  totalEstimatedRevenue,
  availableSlotCount,
  timezone,
  onConfirmBooking,
  onAdjustBooking,
  onCancelBooking,
}: DayScheduleViewProps) {
  const bookedSlots = timeSlots.filter(s => s.job);

  return (
    <div className="bg-white rounded-lg border">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-gray-50 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900">{dateDisplay}</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {bookedSlots.length} job{bookedSlots.length !== 1 ? 's' : ''} &middot;{' '}
              {availableSlotCount} slot{availableSlotCount !== 1 ? 's' : ''} available
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-gray-900">
              ${totalEstimatedRevenue.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">estimated</p>
          </div>
        </div>
      </div>

      {/* Time slots */}
      <div className="px-4 divide-y divide-gray-100">
        {timeSlots.map((slot) => (
          <TimeSlotRow
            key={slot.hour}
            slot={slot}
            timezone={timezone}
            onConfirmBooking={onConfirmBooking}
            onAdjustBooking={onAdjustBooking}
            onCancelBooking={onCancelBooking}
          />
        ))}
      </div>
    </div>
  );
}
