'use client';

import { Clock, Zap } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Toggle } from '@/components/ui/toggle';
import type { NotificationPrefs } from './sms-alerts-section';

const QUIET_START_TIMES = [
  { value: '17:00', label: '5:00 PM' },
  { value: '18:00', label: '6:00 PM' },
  { value: '19:00', label: '7:00 PM' },
  { value: '20:00', label: '8:00 PM' },
  { value: '21:00', label: '9:00 PM' },
  { value: '22:00', label: '10:00 PM' },
  { value: '23:00', label: '11:00 PM' },
];

const QUIET_END_TIMES = [
  { value: '05:00', label: '5:00 AM' },
  { value: '06:00', label: '6:00 AM' },
  { value: '07:00', label: '7:00 AM' },
  { value: '08:00', label: '8:00 AM' },
  { value: '09:00', label: '9:00 AM' },
  { value: '10:00', label: '10:00 AM' },
];

interface QuietHoursSectionProps {
  notificationPrefs: NotificationPrefs;
  onPrefChange: <K extends keyof NotificationPrefs>(key: K, value: NotificationPrefs[K]) => void;
}

export function QuietHoursSection({ notificationPrefs, onPrefChange }: QuietHoursSectionProps) {
  const disabled = notificationPrefs.sms_unsubscribed;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Quiet Hours
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Enable quiet hours toggle */}
        <div className="flex items-center justify-between">
          <div className="flex-1 pr-4">
            <p className="font-medium text-navy-800">Enable quiet hours</p>
            <p className="text-sm text-navy-400">
              Non-urgent notifications will be queued until morning
            </p>
          </div>
          <Toggle
            checked={notificationPrefs.quiet_hours_enabled}
            onChange={(v) => onPrefChange('quiet_hours_enabled', v)}
            disabled={disabled}
          />
        </div>

        {notificationPrefs.quiet_hours_enabled && (
          <>
            {/* Time pickers */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-navy-500 block mb-1">From</label>
                <select
                  value={notificationPrefs.quiet_hours_start}
                  onChange={(e) => onPrefChange('quiet_hours_start', e.target.value)}
                  disabled={disabled}
                  className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-navy-500 disabled:opacity-50"
                >
                  {QUIET_START_TIMES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-navy-500 block mb-1">Until</label>
                <select
                  value={notificationPrefs.quiet_hours_end}
                  onChange={(e) => onPrefChange('quiet_hours_end', e.target.value)}
                  disabled={disabled}
                  className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-navy-500 disabled:opacity-50"
                >
                  {QUIET_END_TIMES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Urgent bypass checkbox */}
            <div className="flex items-center justify-between bg-error-50 rounded-lg p-4">
              <div className="flex-1 pr-4">
                <p className="font-medium text-error-800 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Still send urgent during quiet hours
                </p>
                <p className="text-sm text-error-600">
                  Callback risks and emergencies always alert
                </p>
              </div>
              <Toggle
                checked={notificationPrefs.urgent_bypass_quiet_hours}
                onChange={(v) => onPrefChange('urgent_bypass_quiet_hours', v)}
                disabled={disabled}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
