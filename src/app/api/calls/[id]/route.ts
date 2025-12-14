import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/calls/[id]
 * Returns a single call by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile for timezone
    const { data: profile } = await supabase
      .from('users')
      .select('timezone')
      .eq('id', user.id)
      .single();

    // Fetch the call
    const { data: call, error } = await supabase
      .from('calls')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Call not found' }, { status: 404 });
      }
      console.error('Error fetching call:', error);
      return NextResponse.json({ error: 'Failed to fetch call' }, { status: 500 });
    }

    return NextResponse.json({
      call,
      timezone: profile?.timezone || 'America/New_York',
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
