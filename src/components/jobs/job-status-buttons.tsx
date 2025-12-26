'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle,
  Truck,
  MapPin,
  Check,
  AlertTriangle,
  DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import type { JobStatus } from '@/types/database';

interface JobStatusButtonsProps {
  jobId: string;
  currentStatus: JobStatus;
  needsAction: boolean;
}

// Cancel button removed from status transitions - use CancelModal instead
// to ensure Cal.com bookings are properly cancelled
const statusTransitions: Record<JobStatus, { next: JobStatus | null; label: string; icon: typeof CheckCircle }[]> = {
  new: [
    { next: 'confirmed', label: 'Confirm', icon: CheckCircle },
  ],
  confirmed: [
    { next: 'en_route', label: 'En Route', icon: Truck },
  ],
  en_route: [
    { next: 'on_site', label: 'On Site', icon: MapPin },
  ],
  on_site: [
    { next: 'complete', label: 'Complete', icon: Check },
  ],
  complete: [],
  cancelled: [],
};

export function JobStatusButtons({ jobId, currentStatus, needsAction }: JobStatusButtonsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [showRevenueInput, setShowRevenueInput] = useState(false);
  const [revenue, setRevenue] = useState('');

  const transitions = statusTransitions[currentStatus] || [];

  async function updateStatus(newStatus: JobStatus, revenueAmount?: number) {
    setLoading(newStatus);
    const supabase = createClient();

    const updates: Record<string, unknown> = {
      status: newStatus,
      needs_action: false, // Clear needs_action when status changes
    };

    if (newStatus === 'complete') {
      updates.completed_at = new Date().toISOString();
      if (revenueAmount !== undefined) {
        updates.revenue = revenueAmount;
      }
    }

    // Note: Cancel is now handled via CancelModal to ensure Cal.com sync

    const { error } = await supabase
      .from('jobs')
      .update(updates)
      .eq('id', jobId);

    if (error) {
      console.error('Error updating job:', error);
      setLoading(null);
      return;
    }

    router.refresh();
    setLoading(null);
    setShowRevenueInput(false);
  }

  async function toggleNeedsAction() {
    setLoading('needs_action');
    const supabase = createClient();

    const { error } = await supabase
      .from('jobs')
      .update({ needs_action: !needsAction })
      .eq('id', jobId);

    if (error) {
      console.error('Error updating job:', error);
    }

    router.refresh();
    setLoading(null);
  }

  function handleComplete() {
    setShowRevenueInput(true);
  }

  function submitCompletion() {
    const revenueAmount = revenue ? parseFloat(revenue) : undefined;
    updateStatus('complete', revenueAmount);
  }

  if (currentStatus === 'complete' || currentStatus === 'cancelled') {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Revenue Input Modal */}
      {showRevenueInput && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Job Revenue (optional)
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="number"
                value={revenue}
                onChange={(e) => setRevenue(e.target.value)}
                placeholder="0"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <Button
              variant="default"
              size="lg"
              onClick={submitCompletion}
              disabled={loading === 'complete'}
            >
              {loading === 'complete' ? 'Saving...' : 'Done'}
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={() => setShowRevenueInput(false)}
            >
              Skip
            </Button>
          </div>
        </div>
      )}

      {/* Status Transition Buttons */}
      {!showRevenueInput && (
        <div className="grid grid-cols-1 gap-3">
          {transitions.map(({ next, label, icon: Icon }) => {
            if (!next) return null;

            const isComplete = next === 'complete';

            return (
              <Button
                key={next}
                variant="default"
                size="lg"
                disabled={loading === next}
                onClick={() => isComplete ? handleComplete() : updateStatus(next)}
                className="w-full"
              >
                <Icon className="w-5 h-5 mr-2" />
                {loading === next ? 'Updating...' : label}
              </Button>
            );
          })}
        </div>
      )}

      {/* Needs Action Toggle */}
      <Button
        variant={needsAction ? 'destructive' : 'outline'}
        size="lg"
        className="w-full"
        disabled={loading === 'needs_action'}
        onClick={toggleNeedsAction}
      >
        <AlertTriangle className="w-5 h-5 mr-2" />
        {loading === 'needs_action' ? 'Updating...' : (needsAction ? 'Clear Needs Action' : 'Flag Needs Action')}
      </Button>
    </div>
  );
}
