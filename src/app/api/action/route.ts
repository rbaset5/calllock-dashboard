import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { Lead, PriorityColor, OperatorNote } from '@/types/database';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Priority color sort order (RED first, then GREEN, BLUE, GRAY last)
const PRIORITY_ORDER: Record<PriorityColor, number> = {
  red: 1,
  green: 2,
  blue: 3,
  gray: 4,
};

export interface LeadWithNotes extends Lead {
  notes?: OperatorNote[];
}

export interface ActionResponse {
  leads: LeadWithNotes[];
  counts: {
    total: number;
    red: number;
    green: number;
    blue: number;
    gray: number;
  };
  // Count of booked jobs for today (for tab bar)
  bookedCount: number;
  // Lead with pending outcome (user tapped Call recently)
  pendingOutcome: LeadWithNotes | null;
}

/**
 * GET /api/action
 *
 * Returns leads that need human attention (ACTION items).
 * Ordered by priority_color (RED -> GREEN -> BLUE -> GRAY) then by recency.
 *
 * Query params:
 * - priority_color: Filter by specific color (red, green, blue, gray)
 * - include_snoozed: Include snoozed leads (default: false)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const priorityColor = searchParams.get('priority_color') as PriorityColor | null;
    const includeSnoozed = searchParams.get('include_snoozed') === 'true';

    const cookieStore = await cookies();
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() { },
      },
    });

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const now = new Date().toISOString();

    // Build query for ACTION leads
    // ACTION = leads NOT in 'converted' or 'lost' status
    let query = adminClient
      .from('leads')
      .select('*')
      .eq('user_id', user.id)
      .not('status', 'in', '("converted","lost")');

    // Exclude snoozed leads unless requested
    if (!includeSnoozed) {
      query = query.or(`remind_at.is.null,remind_at.lte.${now}`);
    }

    // Filter by priority color if specified
    if (priorityColor) {
      query = query.eq('priority_color', priorityColor);
    }

    // Order by priority_color (need custom ordering), then by created_at desc
    // Note: Supabase doesn't support custom sort order, so we'll sort in JS
    query = query.order('created_at', { ascending: false });

    const { data: leads, error: leadsError } = await query;

    if (leadsError) {
      console.error('Error fetching action leads:', leadsError);
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
    }

    // Sort by priority color (RED first) then by created_at (newest first)
    const sortedLeads = (leads || []).sort((a, b) => {
      const aPriority = PRIORITY_ORDER[a.priority_color as PriorityColor] || 5;
      const bPriority = PRIORITY_ORDER[b.priority_color as PriorityColor] || 5;

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      // Same priority - sort by created_at descending
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // Get counts by priority color
    const counts = {
      total: sortedLeads.length,
      red: sortedLeads.filter(l => l.priority_color === 'red').length,
      green: sortedLeads.filter(l => l.priority_color === 'green').length,
      blue: sortedLeads.filter(l => l.priority_color === 'blue').length,
      gray: sortedLeads.filter(l => l.priority_color === 'gray').length,
    };

    // Check for pending outcome (lead with recent call tap)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const pendingOutcome = sortedLeads.find(
      lead => lead.last_call_tapped_at && lead.last_call_tapped_at > thirtyMinutesAgo
    ) || null;

    // Fetch notes for all leads
    const leadIds = sortedLeads.map(l => l.id);
    const { data: allNotes } = await adminClient
      .from('operator_notes')
      .select('*')
      .in('lead_id', leadIds)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    // Attach notes to leads
    const leadsWithNotes: LeadWithNotes[] = sortedLeads.map(lead => ({
      ...lead,
      notes: (allNotes || []).filter(n => n.lead_id === lead.id),
    }));

    // Get count of booked jobs (scheduled for today or upcoming)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { count: bookedCount } = await adminClient
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['new', 'confirmed'])
      .gte('scheduled_at', todayStart.toISOString());

    const response: ActionResponse = {
      leads: leadsWithNotes,
      counts,
      bookedCount: bookedCount || 0,
      pendingOutcome: pendingOutcome ? { ...pendingOutcome, notes: (allNotes || []).filter(n => n.lead_id === pendingOutcome.id) } : null,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Action API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
