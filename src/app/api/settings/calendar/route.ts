import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * GET /api/settings/calendar
 *
 * Get calendar connection status
 */
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    const { data: profile, error } = await adminClient
      .from('users')
      .select('cal_com_connected, cal_com_user_id, cal_com_event_type_id')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching calendar status:', error);
      return NextResponse.json({ error: 'Failed to fetch calendar status' }, { status: 500 });
    }

    return NextResponse.json({
      connected: profile?.cal_com_connected || false,
      userId: profile?.cal_com_user_id || null,
      eventTypeId: profile?.cal_com_event_type_id || null,
    });
  } catch (error) {
    console.error('Calendar API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/settings/calendar
 *
 * Disconnect calendar integration
 */
export async function DELETE() {
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from('users')
      .update({
        cal_com_connected: false,
        cal_com_user_id: null,
        cal_com_event_type_id: null,
      })
      .eq('id', user.id);

    if (error) {
      console.error('Error disconnecting calendar:', error);
      return NextResponse.json({ error: 'Failed to disconnect calendar' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Calendar API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
