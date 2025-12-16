import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export interface BusinessHour {
  id?: string;
  day_of_week: number;
  is_open: boolean;
  open_time: string;
  close_time: string;
}

/**
 * GET /api/settings/business-hours
 *
 * Fetch user's business hours
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

    const { data: hours, error } = await adminClient
      .from('business_hours')
      .select('*')
      .eq('user_id', user.id)
      .order('day_of_week', { ascending: true });

    if (error) {
      console.error('Error fetching business hours:', error);
      return NextResponse.json({ error: 'Failed to fetch business hours' }, { status: 500 });
    }

    // If no hours exist, return defaults
    if (!hours || hours.length === 0) {
      const defaultHours: BusinessHour[] = [
        { day_of_week: 0, is_open: false, open_time: '08:00', close_time: '18:00' },
        { day_of_week: 1, is_open: true, open_time: '08:00', close_time: '18:00' },
        { day_of_week: 2, is_open: true, open_time: '08:00', close_time: '18:00' },
        { day_of_week: 3, is_open: true, open_time: '08:00', close_time: '18:00' },
        { day_of_week: 4, is_open: true, open_time: '08:00', close_time: '18:00' },
        { day_of_week: 5, is_open: true, open_time: '08:00', close_time: '18:00' },
        { day_of_week: 6, is_open: false, open_time: '08:00', close_time: '18:00' },
      ];
      return NextResponse.json({ hours: defaultHours, isDefault: true });
    }

    return NextResponse.json({ hours, isDefault: false });
  } catch (error) {
    console.error('Business hours API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/settings/business-hours
 *
 * Update user's business hours
 */
export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const { hours } = body as { hours: BusinessHour[] };

    if (!hours || !Array.isArray(hours) || hours.length !== 7) {
      return NextResponse.json({ error: 'Invalid business hours data' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Upsert all hours (insert or update based on unique constraint)
    const upsertData = hours.map((h) => ({
      user_id: user.id,
      day_of_week: h.day_of_week,
      is_open: h.is_open,
      open_time: h.open_time,
      close_time: h.close_time,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await adminClient
      .from('business_hours')
      .upsert(upsertData, {
        onConflict: 'user_id,day_of_week',
      });

    if (error) {
      console.error('Error updating business hours:', error);
      return NextResponse.json({ error: 'Failed to update business hours' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Business hours API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
