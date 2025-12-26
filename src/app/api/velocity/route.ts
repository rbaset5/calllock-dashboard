import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { Lead, Job, VelocityArchetype, OperatorNote } from '@/types/database';
import {
  sortByVelocity,
  countByArchetype,
  determineArchetype,
  VelocityItem,
} from '@/lib/velocity';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export interface LeadWithNotes extends Lead {
  notes?: OperatorNote[];
  itemType: 'lead';
}

export interface JobWithType extends Job {
  itemType: 'job';
}

export type VelocityItemWithType = LeadWithNotes | JobWithType;

export interface VelocityResponse {
  items: VelocityItemWithType[];
  counts: Record<VelocityArchetype, number>;
  totalLeads: number;
  totalJobs: number;
  pendingOutcome: LeadWithNotes | null;
}

/**
 * GET /api/velocity
 *
 * Returns leads and jobs sorted by velocity score.
 * Combines:
 * - Leads where status != 'converted' AND status != 'lost' AND priority_color != 'gray'
 * - Jobs where status == 'new' OR needs_action == true
 *
 * Sorted by velocity score (HAZARD > RECOVERY > REVENUE > LOGISTICS + time decay)
 *
 * Query params:
 * - archetype: Filter by specific archetype (HAZARD, REVENUE, RECOVERY, LOGISTICS)
 * - include_gray: Include gray/spam leads (default: false)
 * - include_snoozed: Include snoozed leads (default: false)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const archetypeFilter = searchParams.get('archetype') as VelocityArchetype | null;
    const includeGray = searchParams.get('include_gray') === 'true';
    const includeSnoozed = searchParams.get('include_snoozed') === 'true';

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
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const now = new Date().toISOString();

    // Fetch leads
    let leadsQuery = adminClient
      .from('leads')
      .select('*')
      .eq('user_id', user.id)
      .not('status', 'in', '("converted","lost")')
      .order('created_at', { ascending: false });

    // Exclude gray (spam) by default
    if (!includeGray) {
      leadsQuery = leadsQuery.neq('priority_color', 'gray');
    }

    // Apply snooze filter if needed
    if (!includeSnoozed) {
      leadsQuery = leadsQuery.or(`remind_at.is.null,remind_at.lte.${now}`);
    }

    // Fetch jobs that need attention
    const jobsQuery = adminClient
      .from('jobs')
      .select('*')
      .eq('user_id', user.id)
      .or('status.eq.new,needs_action.eq.true')
      .order('created_at', { ascending: false });

    // Execute both queries in parallel
    const [leadsResult, jobsResult] = await Promise.all([
      leadsQuery,
      jobsQuery,
    ]);

    if (leadsResult.error) {
      console.error('Error fetching leads:', leadsResult.error);
      return NextResponse.json(
        { error: 'Failed to fetch leads' },
        { status: 500 }
      );
    }

    if (jobsResult.error) {
      console.error('Error fetching jobs:', jobsResult.error);
      return NextResponse.json(
        { error: 'Failed to fetch jobs' },
        { status: 500 }
      );
    }

    const leads = leadsResult.data || [];
    const jobs = jobsResult.data || [];

    // Add itemType for discrimination
    const leadsWithType: LeadWithNotes[] = leads.map((lead) => ({
      ...lead,
      itemType: 'lead' as const,
    }));

    const jobsWithType: JobWithType[] = jobs.map((job) => ({
      ...job,
      itemType: 'job' as const,
    }));

    // Combine all items
    const allItems: VelocityItemWithType[] = [...leadsWithType, ...jobsWithType];

    // Sort by velocity score
    const sortedItems = sortByVelocity(allItems);

    // Filter by archetype if specified
    const filteredItems = archetypeFilter
      ? sortedItems.filter(
          (item) => determineArchetype(item) === archetypeFilter
        )
      : sortedItems;

    // Calculate counts by archetype (before filtering)
    const counts = countByArchetype(allItems);

    // Check for pending outcome (lead with recent call tap)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const pendingOutcomeLead = leadsWithType.find(
      (lead) =>
        lead.last_call_tapped_at && lead.last_call_tapped_at > thirtyMinutesAgo
    );

    // Fetch notes for all leads
    const leadIds = leadsWithType.map((l) => l.id);
    const { data: allNotes } = leadIds.length > 0
      ? await adminClient
          .from('operator_notes')
          .select('*')
          .in('lead_id', leadIds)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
      : { data: [] };

    // Attach notes to leads in filtered items
    const itemsWithNotes = filteredItems.map((item) => {
      if (item.itemType === 'lead') {
        return {
          ...item,
          notes: (allNotes || []).filter((n) => n.lead_id === item.id),
        };
      }
      return item;
    });

    // Prepare pending outcome with notes
    const pendingOutcome = pendingOutcomeLead
      ? {
          ...pendingOutcomeLead,
          notes: (allNotes || []).filter(
            (n) => n.lead_id === pendingOutcomeLead.id
          ),
        }
      : null;

    const response: VelocityResponse = {
      items: itemsWithNotes,
      counts,
      totalLeads: leads.length,
      totalJobs: jobs.length,
      pendingOutcome,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Velocity API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
