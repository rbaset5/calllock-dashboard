import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export interface TodayStatsResponse {
  total_calls: number;
  ai_booked: number;
}

/**
 * GET /api/stats/today
 *
 * Returns AI stats for today:
 * - total_calls: Total leads received today
 * - ai_booked: Number of appointments booked by AI today
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

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Get start of today in UTC
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Count total leads today
    const { count: totalCalls } = await adminClient
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', todayStart.toISOString());

    // Count AI-booked jobs today
    const { count: aiBooked } = await adminClient
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_ai_booked', true)
      .gte('created_at', todayStart.toISOString());

    const response: TodayStatsResponse = {
      total_calls: totalCalls || 0,
      ai_booked: aiBooked || 0,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
