'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import {
  SmsAlertsSection,
  QuietHoursSection,
  CalendarSection,
  BusinessHoursSection,
  AccountSection,
  type NotificationPrefs,
  type CalendarStatus,
  type BusinessHour,
} from '@/components/settings';
import { GettingColdSection } from '@/components/settings/getting-cold-section';
import Link from 'next/link';

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Profile data
  const [formData, setFormData] = useState({
    phone: '',
    businessName: '',
  });

  // Notification preferences
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

  const [gettingColdThreshold, setGettingColdThreshold] = useState(24);

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
      const { data: profile } = await supabase
        .from('users')
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
      const { data: prefs } = await supabase
        .from('operator_notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (prefs) {
        setNotificationPrefs({
          sms_urgent_leads: prefs.sms_callback_request ?? true,
          sms_standard_leads: prefs.sms_same_day_booking ?? true,
          sms_ai_booking: prefs.sms_future_booking ?? true,
          sms_reminders: prefs.sms_schedule_conflict ?? true,
          sms_daily_digest: false,
          quiet_hours_enabled: prefs.quiet_hours_enabled ?? true,
          quiet_hours_start: prefs.quiet_hours_start || '21:00',
          quiet_hours_end: prefs.quiet_hours_end || '07:00',
          sms_unsubscribed: prefs.sms_unsubscribed || false,
          urgent_bypass_quiet_hours: prefs.urgent_bypass_quiet_hours ?? true,
        });
        setGettingColdThreshold(prefs.getting_cold_threshold_hours ?? 24);
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

  // Handlers
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
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
    const { error: profileError } = await supabase
      .from('users')
      .update({
        phone: formData.phone || null,
        business_name: formData.businessName,
      })
      .eq('id', user.id);

    // Update notification preferences
    const { error: prefsError } = await supabase
      .from('operator_notification_preferences')
      .update({
        sms_callback_request: notificationPrefs.sms_urgent_leads,
        sms_same_day_booking: notificationPrefs.sms_standard_leads,
        sms_future_booking: notificationPrefs.sms_ai_booking,
        sms_schedule_conflict: notificationPrefs.sms_reminders,
        quiet_hours_enabled: notificationPrefs.quiet_hours_enabled,
        quiet_hours_start: notificationPrefs.quiet_hours_start,
        quiet_hours_end: notificationPrefs.quiet_hours_end,
        urgent_bypass_quiet_hours: notificationPrefs.urgent_bypass_quiet_hours,
        getting_cold_threshold_hours: gettingColdThreshold,
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
        <SmsAlertsSection
          notificationPrefs={notificationPrefs}
          phone={formData.phone}
          onPrefChange={updateNotificationPref}
          onPhoneChange={handleChange}
        />

        <QuietHoursSection
          notificationPrefs={notificationPrefs}
          onPrefChange={updateNotificationPref}
        />

        <CalendarSection
          calendarStatus={calendarStatus}
          loading={calendarLoading}
          disconnecting={disconnecting}
          onDisconnect={disconnectCalendar}
        />

        <BusinessHoursSection
          businessHours={businessHours}
          loading={businessHoursLoading}
          onToggleDay={toggleBusinessDay}
          onUpdateTime={updateBusinessTime}
          onApplyAll={applyToAllDays}
        />

        <GettingColdSection
          thresholdHours={gettingColdThreshold}
          onThresholdChange={(hours) => {
            setGettingColdThreshold(hours);
            setSuccess(false);
          }}
        />

        <Link
          href="/settings/past-calls"
          className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-slate-400 text-[20px]">
              history
            </span>
            <span className="font-medium text-slate-700">Past Calls</span>
          </div>
          <span className="material-symbols-outlined text-slate-300 text-[20px]">
            chevron_right
          </span>
        </Link>

        <AccountSection
          businessName={formData.businessName}
          phone={formData.phone}
          signingOut={signingOut}
          onBusinessNameChange={handleChange}
          onSignOut={handleSignOut}
        />

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
