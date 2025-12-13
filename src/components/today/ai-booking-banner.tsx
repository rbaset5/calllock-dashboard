'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bot, Check, Settings, X } from 'lucide-react';
import Link from 'next/link';

interface AIBookingBannerProps {
  count: number;
  onDismiss?: () => void;
}

export function AIBookingBanner({ count, onDismiss }: AIBookingBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (count === 0 || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
          <Bot className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-blue-900">
            {count === 1
              ? 'AI booked a new appointment'
              : `AI booked ${count} new appointments`}
          </p>
          <p className="text-sm text-blue-700 mt-0.5">
            Review {count === 1 ? 'it' : 'them'} to confirm or adjust the timing
          </p>
          <div className="flex items-center gap-3 mt-3">
            <Link href="/schedule">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 h-10 px-4">
                <Check className="w-4 h-4 mr-1.5" />
                Review {count === 1 ? 'Booking' : 'Bookings'}
              </Button>
            </Link>
            <button
              onClick={handleDismiss}
              className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
            >
              Dismiss
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 hover:bg-blue-100 rounded"
        >
          <X className="w-4 h-4 text-blue-400" />
        </button>
      </div>
    </div>
  );
}
