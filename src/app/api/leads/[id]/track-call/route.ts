import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * POST /api/leads/[id]/track-call
 *
 * Records when user taps "Call" button on a lead.
 * This timestamp is used to show the outcome prompt when they return.
 *
 * The last_call_tapped_at field enables server-side detection of pending
 * outcomes, avoiding fragile client-side sessionStorage approaches.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;

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

    // Verify lead belongs to user
    const { data: lead, error: leadError } = await adminClient
      .from('leads')
      .select('id, user_id')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (lead.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update last_call_tapped_at timestamp
    const { error: updateError } = await adminClient
      .from('leads')
      .update({
        last_call_tapped_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId);

    if (updateError) {
      console.error('Error tracking call:', updateError);
      return NextResponse.json(
        { error: 'Failed to track call' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Call tracked successfully',
      lead_id: leadId,
      tracked_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Track call API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
