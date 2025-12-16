import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Items older than 3 days are considered stale
const STALE_THRESHOLD_DAYS = 3;

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    });

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const now = new Date();
    const staleThreshold = new Date(now.getTime() - STALE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);

    // Count leads that need action (not converted/lost, and either no remind_at or remind_at is past)
    const { data: leads } = await adminClient
      .from('leads')
      .select('id, created_at')
      .eq('user_id', user.id)
      .not('status', 'in', '("converted","lost")')
      .or('remind_at.is.null,remind_at.lte.' + now.toISOString());

    // Count pending alerts
    const { data: alerts } = await adminClient
      .from('sms_alert_context')
      .select('id, created_at')
      .eq('user_id', user.id)
      .eq('status', 'pending');

    const leadsCount = leads?.length || 0;
    const alertsCount = alerts?.length || 0;
    const totalCount = leadsCount + alertsCount;

    // Count stale items (older than threshold)
    const staleLeads = leads?.filter(l => new Date(l.created_at) < staleThreshold).length || 0;
    const staleAlerts = alerts?.filter(a => new Date(a.created_at) < staleThreshold).length || 0;
    const staleCount = staleLeads + staleAlerts;

    return NextResponse.json({
      totalCount,
      staleCount,
      leadsCount,
      alertsCount,
    });
  } catch (error) {
    console.error('Inbox count API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
