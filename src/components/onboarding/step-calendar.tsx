'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, ArrowRight, ExternalLink, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepCalendarProps {
  initialData: {
    calComConnected?: boolean;
  };
  onNext: (data: { calComConnected: boolean }) => void;
  onBack: () => void;
}

export function StepCalendar({ initialData, onNext, onBack }: StepCalendarProps) {
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(initialData.calComConnected || false);
  const [error, setError] = useState<string | null>(null);

  const handleConnectCalendar = async () => {
    setConnecting(true);
    setError(null);

    try {
      // In production, this would initiate OAuth flow with Cal.com
      // For now, we'll simulate the connection
      const response = await fetch('/api/calendar/connect', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to connect calendar');
      }

      const data = await response.json();

      if (data.authUrl) {
        // Redirect to Cal.com OAuth
        window.location.href = data.authUrl;
        return;
      }

      // If already connected
      setConnected(true);
    } catch (err) {
      console.error('Calendar connection error:', err);
      setError('Failed to connect calendar. Please try again.');
    } finally {
      setConnecting(false);
    }
  };

  const handleSkip = () => {
    onNext({ calComConnected: false });
  };

  const handleContinue = () => {
    onNext({ calComConnected: connected });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-8 h-8 text-primary-600" />
        </div>
        <h2 className="text-2xl font-bold text-navy-800">Connect Your Calendar</h2>
        <p className="text-gray-600 mt-2">
          Let our AI book appointments directly to your calendar
        </p>
      </div>

      <div className="space-y-4">
        {/* Connection Status */}
        {connected ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              <div>
                <p className="font-medium text-emerald-800">Calendar Connected!</p>
                <p className="text-sm text-emerald-700">
                  Your Cal.com calendar is ready for AI bookings.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Cal.com Integration Card */}
            <div className="border-2 border-gray-200 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">Cal</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Cal.com</h3>
                  <p className="text-sm text-gray-500">Free scheduling platform</p>
                </div>
              </div>

              <p className="text-sm text-gray-600">
                We use Cal.com to manage your scheduling. It syncs with Google Calendar,
                Outlook, and more.
              </p>

              <Button
                onClick={handleConnectCalendar}
                disabled={connecting}
                className="w-full"
              >
                {connecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    Connect Cal.com
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
            </div>

            {/* Benefits */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">With calendar connected:</h4>
              <ul className="space-y-2 text-sm text-blue-700">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  AI can book appointments automatically
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Avoid double-bookings
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Customers can self-book via link
                </li>
              </ul>
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button type="button" variant="ghost" onClick={onBack} className="flex-1">
          Back
        </Button>
        {connected ? (
          <Button onClick={handleContinue} className="flex-1">
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button variant="outline" onClick={handleSkip} className="flex-1">
            Skip for now
          </Button>
        )}
      </div>

      {!connected && (
        <p className="text-xs text-center text-gray-500">
          You can connect your calendar later in Settings
        </p>
      )}
    </div>
  );
}
