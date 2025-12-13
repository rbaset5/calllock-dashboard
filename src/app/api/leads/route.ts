import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { Lead, LeadStatus, LeadPriority } from '@/types/database';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export interface LeadsResponse {
  leads: Lead[];
  counts: {
    total: number;
    callback_requested: number;
    thinking: number;
    voicemail_left: number;
    deferred: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as LeadStatus | null;
    const priority = searchParams.get('priority') as LeadPriority | null;

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

    // Build query
    let query = adminClient
      .from('leads')
      .select('*')
      .eq('user_id', user.id)
      .not('status', 'in', '("converted","lost")')
      .or('remind_at.is.null,remind_at.lte.' + new Date().toISOString());

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (priority) {
      query = query.eq('priority', priority);
    }

    // Order by priority and recency
    query = query.order('priority', { ascending: true })
      .order('created_at', { ascending: false });

    const { data: leads, error: leadsError } = await query;

    if (leadsError) {
      console.error('Error fetching leads:', leadsError);
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
    }

    // Get counts for each status
    const { data: allLeads } = await adminClient
      .from('leads')
      .select('status')
      .eq('user_id', user.id)
      .not('status', 'in', '("converted","lost")')
      .or('remind_at.is.null,remind_at.lte.' + new Date().toISOString());

    const counts = {
      total: allLeads?.length || 0,
      callback_requested: allLeads?.filter(l => l.status === 'callback_requested').length || 0,
      thinking: allLeads?.filter(l => l.status === 'thinking').length || 0,
      voicemail_left: allLeads?.filter(l => l.status === 'voicemail_left').length || 0,
      deferred: allLeads?.filter(l => l.status === 'deferred').length || 0,
    };

    const response: LeadsResponse = {
      leads: leads || [],
      counts,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Leads API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
