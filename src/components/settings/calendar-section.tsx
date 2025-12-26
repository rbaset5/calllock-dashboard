'use client';

import { useRouter } from 'next/navigation';
import { Calendar, Check, X, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export interface CalendarStatus {
  connected: boolean;
  userId: string | null;
  eventTypeId: number | null;
}

interface CalendarSectionProps {
  calendarStatus: CalendarStatus;
  loading: boolean;
  disconnecting: boolean;
  onDisconnect: () => void;
}

export function CalendarSection({
  calendarStatus,
  loading,
  disconnecting,
  onDisconnect,
}: CalendarSectionProps) {
  const router = useRouter();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Calendar Connection
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="animate-pulse h-12 bg-navy-100 rounded" />
        ) : calendarStatus.connected ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-success-50 border border-success-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-success-100 rounded-full flex items-center justify-center">
                  <Check className="w-5 h-5 text-success-600" />
                </div>
                <div>
                  <p className="font-medium text-success-800">Cal.com Connected</p>
                  <p className="text-sm text-success-600">
                    AI can book appointments to your calendar
                  </p>
                </div>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDisconnect}
              disabled={disconnecting}
              className="text-error-600 hover:text-error-700 hover:bg-error-50"
            >
              <X className="w-4 h-4 mr-2" />
              {disconnecting ? 'Disconnecting...' : 'Disconnect Calendar'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-gold-50 border border-gold-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gold-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-gold-600" />
                </div>
                <div>
                  <p className="font-medium text-gold-800">Calendar Not Connected</p>
                  <p className="text-sm text-gold-600">
                    Connect Cal.com to let AI book appointments
                  </p>
                </div>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/onboarding?step=2')}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Connect Calendar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
