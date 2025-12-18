'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Save,
  Phone,
  Building,
  Bell,
  Clock,
  Calendar,
  Check,
  X,
  AlertTriangle,
  Zap,
  LogOut,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

// Removed TIMEZONES - not needed in V4 simplified settings

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

const TIME_OPTIONS = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00',
];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatTime(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

interface NotificationPrefs {
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

interface BusinessHour {
  day_of_week: number;
  is_open: boolean;
  open_time: string;
  close_time: string;
}

// ServiceArea interface removed - not in V4 PRD

interface CalendarStatus {
  connected: boolean;
  userId: string | null;
  eventTypeId: number | null;
}

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Profile data - simplified for V4
  const [formData, setFormData] = useState({
    phone: '',
    businessName: '',
  });

  // Notification preferences - V4 PRD structure
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>({
    sms_urgent_leads: true,
    sms_standard_leads: true,
    sms_ai_booking: true,
    sms_reminders: true,
    sms_daily_digest: false,
    quiet_hours_enabled: true,
    quiet_hours_start: '21:00',
    quiet_hours_end: '07:00',
    sms_unsubscribed: false,
    urgent_bypass_quiet_hours: true,
  });

  // Business hours
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>([]);
  const [businessHoursLoading, setBusinessHoursLoading] = useState(true);

  // Calendar status
  const [calendarStatus, setCalendarStatus] = useState<CalendarStatus>({
    connected: false,
    userId: null,
    eventTypeId: null,
  });
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  // Load profile and notification preferences
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
          phone: profile.phone || '',
          businessName: profile.business_name,
        });
      }

      // Load notification preferences
      const { data: prefs } = await (supabase
        .from('operator_notification_preferences') as any)
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (prefs) {
        // Map from old field names to new V4 names
        setNotificationPrefs({
          sms_urgent_leads: prefs.sms_callback_request ?? true,
          sms_standard_leads: prefs.sms_same_day_booking ?? true,
          sms_ai_booking: prefs.sms_future_booking ?? true,
          sms_reminders: prefs.sms_schedule_conflict ?? true,
          sms_daily_digest: false, // New field, default off
          quiet_hours_enabled: prefs.quiet_hours_enabled ?? true,
          quiet_hours_start: prefs.quiet_hours_start || '21:00',
          quiet_hours_end: prefs.quiet_hours_end || '07:00',
          sms_unsubscribed: prefs.sms_unsubscribed || false,
          urgent_bypass_quiet_hours: prefs.urgent_bypass_quiet_hours ?? true,
        });
      }

      setLoading(false);
    }

    loadProfile();
  }, [router]);

  // Load business hours
  useEffect(() => {
    async function loadBusinessHours() {
      try {
        const res = await fetch('/api/settings/business-hours');
        const data = await res.json();
        if (data.hours) {
          setBusinessHours(data.hours);
        }
      } catch (error) {
        console.error('Failed to load business hours:', error);
      } finally {
        setBusinessHoursLoading(false);
      }
    }
    loadBusinessHours();
  }, []);

  // Service areas removed - not in V4 PRD

  // Load calendar status
  useEffect(() => {
    async function loadCalendarStatus() {
      try {
        const res = await fetch('/api/settings/calendar');
        const data = await res.json();
        setCalendarStatus({
          connected: data.connected || false,
          userId: data.userId || null,
          eventTypeId: data.eventTypeId || null,
        });
      } catch (error) {
        console.error('Failed to load calendar status:', error);
      } finally {
        setCalendarLoading(false);
      }
    }
    loadCalendarStatus();
  }, []);

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

  const toggleBusinessDay = useCallback((dayOfWeek: number) => {
    setBusinessHours((prev) =>
      prev.map((day) =>
        day.day_of_week === dayOfWeek ? { ...day, is_open: !day.is_open } : day
      )
    );
    setSuccess(false);
  }, []);

  const updateBusinessTime = useCallback(
    (dayOfWeek: number, field: 'open_time' | 'close_time', value: string) => {
      setBusinessHours((prev) =>
        prev.map((day) =>
          day.day_of_week === dayOfWeek ? { ...day, [field]: value } : day
        )
      );
      setSuccess(false);
    },
    []
  );

  const applyToAllDays = useCallback((openTime: string, closeTime: string) => {
    setBusinessHours((prev) =>
      prev.map((day) => ({
        ...day,
        open_time: day.is_open ? openTime : day.open_time,
        close_time: day.is_open ? closeTime : day.close_time,
      }))
    );
    setSuccess(false);
  }, []);

  // Service area functions removed - not in V4 PRD

  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }, [router]);

  const disconnectCalendar = useCallback(async () => {
    if (!confirm('Are you sure you want to disconnect your calendar? AI will no longer be able to book appointments.')) {
      return;
    }

    setDisconnecting(true);
    try {
      const res = await fetch('/api/settings/calendar', { method: 'DELETE' });
      if (res.ok) {
        setCalendarStatus({ connected: false, userId: null, eventTypeId: null });
      }
    } catch (error) {
      console.error('Failed to disconnect calendar:', error);
    } finally {
      setDisconnecting(false);
    }
  }, []);

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
      })
      .eq('id', user.id);

    // Update notification preferences - map V4 field names to DB columns
    const { error: prefsError } = await (supabase
      .from('operator_notification_preferences') as any)
      .update({
        sms_callback_request: notificationPrefs.sms_urgent_leads,
        sms_same_day_booking: notificationPrefs.sms_standard_leads,
        sms_future_booking: notificationPrefs.sms_ai_booking,
        sms_schedule_conflict: notificationPrefs.sms_reminders,
        // sms_daily_digest - would need new DB column
        quiet_hours_enabled: notificationPrefs.quiet_hours_enabled,
        quiet_hours_start: notificationPrefs.quiet_hours_start,
        quiet_hours_end: notificationPrefs.quiet_hours_end,
        urgent_bypass_quiet_hours: notificationPrefs.urgent_bypass_quiet_hours,
      })
      .eq('user_id', user.id);

    // Update business hours
    const hoursRes = await fetch('/api/settings/business-hours', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hours: businessHours }),
    });

    setSaving(false);

    if (!profileError && !prefsError && hoursRes.ok) {
      setSuccess(true);
      router.refresh();
    }
  }

  if (loading) {
    return (
      <div className="cl-page-container">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-navy-100 rounded w-32" />
          <div className="h-64 bg-navy-100 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="cl-page-container space-y-4 pb-24">
      <h1 className="cl-heading-page">Settings</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Section 1: SMS Alerts */}
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
                value={formData.phone}
                onChange={handleChange}
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
                onChange={(v) => updateNotificationPref('sms_urgent_leads', v)}
                disabled={notificationPrefs.sms_unsubscribed}
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
                onChange={(v) => updateNotificationPref('sms_standard_leads', v)}
                disabled={notificationPrefs.sms_unsubscribed}
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
                onChange={(v) => updateNotificationPref('sms_ai_booking', v)}
                disabled={notificationPrefs.sms_unsubscribed}
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
                onChange={(v) => updateNotificationPref('sms_reminders', v)}
                disabled={notificationPrefs.sms_unsubscribed}
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
                onChange={(v) => updateNotificationPref('sms_daily_digest', v)}
                disabled={notificationPrefs.sms_unsubscribed}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Quiet Hours */}
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
                onChange={(v) => updateNotificationPref('quiet_hours_enabled', v)}
                disabled={notificationPrefs.sms_unsubscribed}
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
                      onChange={(e) => updateNotificationPref('quiet_hours_start', e.target.value)}
                      disabled={notificationPrefs.sms_unsubscribed}
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
                      onChange={(e) => updateNotificationPref('quiet_hours_end', e.target.value)}
                      disabled={notificationPrefs.sms_unsubscribed}
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
                    onChange={(v) => updateNotificationPref('urgent_bypass_quiet_hours', v)}
                    disabled={notificationPrefs.sms_unsubscribed}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Section 3: Calendar Connection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Calendar Connection
            </CardTitle>
          </CardHeader>
          <CardContent>
            {calendarLoading ? (
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
                  onClick={disconnectCalendar}
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

        {/* Section 4: Business Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Business Hours
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {businessHoursLoading ? (
              <div className="animate-pulse space-y-2">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className="h-12 bg-navy-100 rounded" />
                ))}
              </div>
            ) : (
              <>
                {/* Quick Apply */}
                <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <span className="text-sm text-gray-600">Quick apply:</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => applyToAllDays('08:00', '17:00')}
                      className="px-3 py-1 text-xs bg-white border rounded-full hover:bg-gray-50"
                    >
                      8-5
                    </button>
                    <button
                      type="button"
                      onClick={() => applyToAllDays('09:00', '18:00')}
                      className="px-3 py-1 text-xs bg-white border rounded-full hover:bg-gray-50"
                    >
                      9-6
                    </button>
                    <button
                      type="button"
                      onClick={() => applyToAllDays('07:00', '19:00')}
                      className="px-3 py-1 text-xs bg-white border rounded-full hover:bg-gray-50"
                    >
                      7-7
                    </button>
                  </div>
                </div>

                {/* Schedule Grid */}
                <div className="space-y-2">
                  {businessHours.map((day) => (
                    <div
                      key={day.day_of_week}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                        day.is_open ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100'
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => toggleBusinessDay(day.day_of_week)}
                        className={cn(
                          'w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors',
                          day.is_open
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-200 text-gray-400'
                        )}
                      >
                        {day.is_open && <Check className="w-4 h-4" />}
                      </button>

                      <span
                        className={cn(
                          'w-20 text-sm font-medium',
                          day.is_open ? 'text-gray-900' : 'text-gray-400'
                        )}
                      >
                        {DAY_NAMES[day.day_of_week].slice(0, 3)}
                      </span>

                      {day.is_open ? (
                        <div className="flex items-center gap-2 flex-1">
                          <select
                            value={day.open_time}
                            onChange={(e) =>
                              updateBusinessTime(day.day_of_week, 'open_time', e.target.value)
                            }
                            className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-primary-500"
                          >
                            {TIME_OPTIONS.map((time) => (
                              <option key={`open-${time}`} value={time}>
                                {formatTime(time)}
                              </option>
                            ))}
                          </select>
                          <span className="text-gray-400">to</span>
                          <select
                            value={day.close_time}
                            onChange={(e) =>
                              updateBusinessTime(day.day_of_week, 'close_time', e.target.value)
                            }
                            className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-primary-500"
                          >
                            {TIME_OPTIONS.map((time) => (
                              <option key={`close-${time}`} value={time}>
                                {formatTime(time)}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 flex-1">Closed</span>
                      )}
                    </div>
                  ))}
                </div>

                <p className="text-xs text-gray-500">
                  This determines when AI can book appointments. Emergency calls are always forwarded.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Section 5: Account */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Business name */}
            <div>
              <label className="text-sm font-medium text-navy-700 mb-2 block">
                Business Name
              </label>
              <input
                type="text"
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-navy-200 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
              />
            </div>

            {/* Business phone (display only) */}
            <div>
              <label className="text-sm font-medium text-navy-700 mb-2 block">
                Business Phone
              </label>
              <div className="px-4 py-3 border border-navy-200 rounded-lg bg-navy-50 text-navy-600">
                {formData.phone || 'Not set'}
              </div>
              <p className="mt-1 text-xs text-navy-400">
                Your number for receiving SMS alerts
              </p>
            </div>

            {/* Sign out link */}
            <div className="pt-4 border-t border-navy-100">
              <Button
                type="button"
                variant="ghost"
                onClick={handleSignOut}
                disabled={signingOut}
                className="text-error-600 hover:text-error-700 hover:bg-error-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {signingOut ? 'Signing Out...' : 'Sign Out'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Success message and Save button */}
        {success && (
          <div className="bg-success-50 border border-success-200 text-success-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <Check className="w-4 h-4" />
            Settings saved successfully!
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={saving}>
          <Save className="w-5 h-5 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </form>
    </div>
  );
}
