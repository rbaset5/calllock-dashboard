'use client';

import { Bell, Phone } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Toggle } from '@/components/ui/toggle';

export interface NotificationPrefs {
  sms_urgent_leads: boolean;
  sms_standard_leads: boolean;
  sms_ai_booking: boolean;
  sms_reminders: boolean;
  sms_daily_digest: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  sms_unsubscribed: boolean;
  urgent_bypass_quiet_hours: boolean;
}

interface SmsAlertsSectionProps {
  notificationPrefs: NotificationPrefs;
  phone: string;
  onPrefChange: <K extends keyof NotificationPrefs>(key: K, value: NotificationPrefs[K]) => void;
  onPhoneChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function SmsAlertsSection({
  notificationPrefs,
  phone,
  onPrefChange,
  onPhoneChange,
}: SmsAlertsSectionProps) {
  const disabled = notificationPrefs.sms_unsubscribed;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          SMS Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Alert phone number */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-navy-700 mb-2">
            <Phone className="w-4 h-4" />
            Alert Phone Number
          </label>
          <input
            type="tel"
            name="phone"
            value={phone}
            onChange={onPhoneChange}
            placeholder="+1 (512) 555-1234"
            className="w-full px-4 py-3 border border-navy-200 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-navy-500 placeholder:text-navy-300"
          />
          <p className="mt-1 text-xs text-navy-400">
            Where you receive SMS alerts for new leads and bookings
          </p>
        </div>

        {notificationPrefs.sms_unsubscribed && (
          <div className="bg-gold-50 border border-gold-200 text-gold-800 px-4 py-3 rounded-lg text-sm">
            You have unsubscribed from SMS. Text START to resubscribe.
          </div>
        )}

        {/* Urgent leads toggle */}
        <div className="flex items-center justify-between">
          <div className="flex-1 pr-4">
            <p className="font-medium text-navy-800">Urgent leads</p>
            <p className="text-sm text-navy-400">
              Callback risks and high-priority leads
            </p>
          </div>
          <Toggle
            checked={notificationPrefs.sms_urgent_leads}
            onChange={(v) => onPrefChange('sms_urgent_leads', v)}
            disabled={disabled}
          />
        </div>

        {/* Standard new leads toggle */}
        <div className="flex items-center justify-between">
          <div className="flex-1 pr-4">
            <p className="font-medium text-navy-800">Standard new leads</p>
            <p className="text-sm text-navy-400">
              All new leads that need attention
            </p>
          </div>
          <Toggle
            checked={notificationPrefs.sms_standard_leads}
            onChange={(v) => onPrefChange('sms_standard_leads', v)}
            disabled={disabled}
          />
        </div>

        {/* AI booking confirmations toggle */}
        <div className="flex items-center justify-between">
          <div className="flex-1 pr-4">
            <p className="font-medium text-navy-800">AI booking confirmations</p>
            <p className="text-sm text-navy-400">
              When AI books appointments automatically
            </p>
          </div>
          <Toggle
            checked={notificationPrefs.sms_ai_booking}
            onChange={(v) => onPrefChange('sms_ai_booking', v)}
            disabled={disabled}
          />
        </div>

        {/* Reminders toggle */}
        <div className="flex items-center justify-between">
          <div className="flex-1 pr-4">
            <p className="font-medium text-navy-800">Reminders</p>
            <p className="text-sm text-navy-400">
              Schedule conflicts and follow-up reminders
            </p>
          </div>
          <Toggle
            checked={notificationPrefs.sms_reminders}
            onChange={(v) => onPrefChange('sms_reminders', v)}
            disabled={disabled}
          />
        </div>

        {/* Daily digest toggle */}
        <div className="flex items-center justify-between">
          <div className="flex-1 pr-4">
            <p className="font-medium text-navy-800">Daily digest</p>
            <p className="text-sm text-navy-400">
              Summary of leads and bookings each morning
            </p>
          </div>
          <Toggle
            checked={notificationPrefs.sms_daily_digest}
            onChange={(v) => onPrefChange('sms_daily_digest', v)}
            disabled={disabled}
          />
        </div>
      </CardContent>
    </Card>
  );
}
