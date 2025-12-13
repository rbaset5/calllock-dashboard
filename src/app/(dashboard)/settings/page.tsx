'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, User, Phone, Building, Globe, Bell, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { createClient } from '@/lib/supabase/client';

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time' },
  { value: 'America/Chicago', label: 'Central Time' },
  { value: 'America/Denver', label: 'Mountain Time' },
  { value: 'America/Los_Angeles', label: 'Pacific Time' },
  { value: 'America/Phoenix', label: 'Arizona Time' },
];

// Generate time options for quiet hours
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

interface NotificationPrefs {
  sms_same_day_booking: boolean;
  sms_future_booking: boolean;
  sms_callback_request: boolean;
  sms_schedule_conflict: boolean;
  sms_cancellation: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  sms_unsubscribed: boolean;
}

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    businessName: '',
    timezone: 'America/New_York',
  });

  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>({
    sms_same_day_booking: true,
    sms_future_booking: false,
    sms_callback_request: true,
    sms_schedule_conflict: true,
    sms_cancellation: true,
    quiet_hours_enabled: true,
    quiet_hours_start: '19:00',
    quiet_hours_end: '06:00',
    sms_unsubscribed: false,
  });

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // Load user profile
      const { data: profile } = await (supabase
        .from('users') as any)
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        setFormData({
          email: profile.email,
          phone: profile.phone || '',
          businessName: profile.business_name,
          timezone: profile.timezone,
        });
      }

      // Load notification preferences
      const { data: prefs } = await (supabase
        .from('operator_notification_preferences') as any)
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (prefs) {
        setNotificationPrefs({
          sms_same_day_booking: prefs.sms_same_day_booking,
          sms_future_booking: prefs.sms_future_booking,
          sms_callback_request: prefs.sms_callback_request,
          sms_schedule_conflict: prefs.sms_schedule_conflict,
          sms_cancellation: prefs.sms_cancellation,
          quiet_hours_enabled: prefs.quiet_hours_enabled,
          quiet_hours_start: prefs.quiet_hours_start,
          quiet_hours_end: prefs.quiet_hours_end,
          sms_unsubscribed: prefs.sms_unsubscribed || false,
        });
      }

      setLoading(false);
    }

    loadProfile();
  }, [router]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setSuccess(false);
  }

  function updateNotificationPref<K extends keyof NotificationPrefs>(
    key: K,
    value: NotificationPrefs[K]
  ) {
    setNotificationPrefs((prev) => ({
      ...prev,
      [key]: value,
    }));
    setSuccess(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    // Update user profile
    const { error: profileError } = await (supabase
      .from('users') as any)
      .update({
        phone: formData.phone || null,
        business_name: formData.businessName,
        timezone: formData.timezone,
      })
      .eq('id', user.id);

    // Update notification preferences
    const { error: prefsError } = await (supabase
      .from('operator_notification_preferences') as any)
      .update({
        sms_same_day_booking: notificationPrefs.sms_same_day_booking,
        sms_future_booking: notificationPrefs.sms_future_booking,
        sms_callback_request: notificationPrefs.sms_callback_request,
        sms_schedule_conflict: notificationPrefs.sms_schedule_conflict,
        sms_cancellation: notificationPrefs.sms_cancellation,
        quiet_hours_enabled: notificationPrefs.quiet_hours_enabled,
        quiet_hours_start: notificationPrefs.quiet_hours_start,
        quiet_hours_end: notificationPrefs.quiet_hours_end,
      })
      .eq('user_id', user.id);

    setSaving(false);

    if (!profileError && !prefsError) {
      setSuccess(true);
      router.refresh();
    }
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-32" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Settings</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4" />
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                disabled
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              />
              <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Building className="w-4 h-4" />
                Business Name
              </label>
              <input
                type="text"
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Phone className="w-4 h-4" />
                Phone (for SMS alerts)
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+1 (512) 555-1234"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Receive new job alerts and reminders via SMS
              </p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Globe className="w-4 h-4" />
                Timezone
              </label>
              <select
                name="timezone"
                value={formData.timezone}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* SMS Notifications Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              SMS Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {notificationPrefs.sms_unsubscribed && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm">
                You have unsubscribed from SMS. Text START to {process.env.NEXT_PUBLIC_TWILIO_NUMBER || 'your CallLock number'} to resubscribe.
              </div>
            )}

            {/* Same-day bookings */}
            <div className="flex items-center justify-between">
              <div className="flex-1 pr-4">
                <p className="font-medium text-gray-900">Same-day bookings</p>
                <p className="text-sm text-gray-500">
                  Get SMS when AI books an appointment for today
                </p>
              </div>
              <Toggle
                checked={notificationPrefs.sms_same_day_booking}
                onChange={(v) => updateNotificationPref('sms_same_day_booking', v)}
                disabled={notificationPrefs.sms_unsubscribed}
              />
            </div>

            {/* Future bookings */}
            <div className="flex items-center justify-between">
              <div className="flex-1 pr-4">
                <p className="font-medium text-gray-900">Future bookings</p>
                <p className="text-sm text-gray-500">
                  Get SMS for appointments scheduled 2+ days out
                </p>
              </div>
              <Toggle
                checked={notificationPrefs.sms_future_booking}
                onChange={(v) => updateNotificationPref('sms_future_booking', v)}
                disabled={notificationPrefs.sms_unsubscribed}
              />
            </div>

            {/* Callback requests */}
            <div className="flex items-center justify-between">
              <div className="flex-1 pr-4">
                <p className="font-medium text-gray-900">Callback requests</p>
                <p className="text-sm text-gray-500">
                  Get SMS when customer requests a callback
                </p>
              </div>
              <Toggle
                checked={notificationPrefs.sms_callback_request}
                onChange={(v) => updateNotificationPref('sms_callback_request', v)}
                disabled={notificationPrefs.sms_unsubscribed}
              />
            </div>

            {/* Same-day cancellations */}
            <div className="flex items-center justify-between">
              <div className="flex-1 pr-4">
                <p className="font-medium text-gray-900">Same-day cancellations</p>
                <p className="text-sm text-gray-500">
                  Get SMS when a same-day job is cancelled
                </p>
              </div>
              <Toggle
                checked={notificationPrefs.sms_cancellation}
                onChange={(v) => updateNotificationPref('sms_cancellation', v)}
                disabled={notificationPrefs.sms_unsubscribed}
              />
            </div>

            {/* Quiet Hours Section */}
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1 pr-4">
                  <p className="font-medium text-gray-900 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Quiet Hours
                  </p>
                  <p className="text-sm text-gray-500">
                    Notifications will be queued and sent when quiet hours end
                  </p>
                </div>
                <Toggle
                  checked={notificationPrefs.quiet_hours_enabled}
                  onChange={(v) => updateNotificationPref('quiet_hours_enabled', v)}
                  disabled={notificationPrefs.sms_unsubscribed}
                />
              </div>

              {notificationPrefs.quiet_hours_enabled && (
                <div className="grid grid-cols-2 gap-4 ml-6">
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">Start</label>
                    <select
                      value={notificationPrefs.quiet_hours_start}
                      onChange={(e) => updateNotificationPref('quiet_hours_start', e.target.value)}
                      disabled={notificationPrefs.sms_unsubscribed}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
                    >
                      {QUIET_START_TIMES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">End</label>
                    <select
                      value={notificationPrefs.quiet_hours_end}
                      onChange={(e) => updateNotificationPref('quiet_hours_end', e.target.value)}
                      disabled={notificationPrefs.sms_unsubscribed}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
                    >
                      {QUIET_END_TIMES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <p className="text-xs text-gray-400 pt-2">
              Reply OK to confirm bookings, CALL for customer phone, STOP to unsubscribe
            </p>
          </CardContent>
        </Card>

        {/* Success message and Save button */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
            Settings saved successfully!
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" loading={saving}>
          <Save className="w-5 h-5 mr-2" />
          Save Changes
        </Button>
      </form>
    </div>
  );
}
