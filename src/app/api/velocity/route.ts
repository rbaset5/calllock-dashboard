import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { Lead, Job, OperatorNote, VelocityArchetype } from '@/types/database';
import {
  UrgencyTier,
  sortByUrgency,
  countByUrgencyTier,
  determineUrgencyTier,
  getMinutesOld,
  formatTimeAgo,
} from '@/lib/urgency';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const DEFAULT_GETTING_COLD_THRESHOLD_HOURS = 24;

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

export interface NowItem {
  id: string;
  itemType: 'lead' | 'job';
  urgencyTier: UrgencyTier;
  customer_name: string;
  customer_phone: string;
  customer_address: string | null;
  issue_summary: string;
  revenue_display: string;
  created_at: string;
  minutes_old: number;
  time_ago: string;
  scheduled_at?: string;
  is_ai_booked?: boolean;
  ai_summary?: string | null;
  notes?: OperatorNote[];
  priority_color?: string;
  urgency?: string;
}

export interface NowResponse {
  items: NowItem[];
  counts: Record<UrgencyTier, number> & { total: number; urgent: number };
  pendingOutcome: NowItem | null;
  settings: {
    gettingColdThresholdHours: number;
  };
}

function extractIssueSummary(item: Lead | Job): string {
  const summary = (item as Lead).ai_summary || (item as Job).ai_summary;
  if (summary) {
    const firstSentence = summary.split(/[.!?]/)[0].trim();
    return firstSentence.length > 60 ? firstSentence.slice(0, 60) + '...' : firstSentence;
  }
  const issueDesc = (item as Lead).issue_description;
  if (issueDesc) {
    return issueDesc.length > 60 ? issueDesc.slice(0, 60) + '...' : issueDesc;
  }
  return 'Service call';
}

function getRevenueDisplay(item: Lead | Job): string {
  const tierLabel = item.revenue_tier_label;
  if (tierLabel) return tierLabel;
  
  const tier = item.revenue_tier;
  if (tier === 'replacement') return '$$$$';
  if (tier === 'major_repair') return '$$$';
  if (tier === 'standard_repair') return '$$';
  if (tier === 'minor' || tier === 'diagnostic') return '$';
  
  return '';
}

function transformToNowItem(
  item: Lead | Job,
  itemType: 'lead' | 'job',
  gettingColdThresholdHours: number,
  notes?: OperatorNote[]
): NowItem {
  const urgencyTier = determineUrgencyTier(item, gettingColdThresholdHours);
  const minutesOld = getMinutesOld(item.created_at);

  return {
    id: item.id,
    itemType,
    urgencyTier,
    customer_name: item.customer_name,
    customer_phone: item.customer_phone,
    customer_address: itemType === 'lead' 
      ? (item as Lead).customer_address || null 
      : (item as Job).customer_address,
    issue_summary: extractIssueSummary(item),
    revenue_display: getRevenueDisplay(item),
    created_at: item.created_at,
    minutes_old: minutesOld,
    time_ago: formatTimeAgo(item.created_at),
    scheduled_at: (item as Job).scheduled_at || undefined,
    is_ai_booked: (item as Job).is_ai_booked || undefined,
    ai_summary: item.ai_summary,
    notes,
    priority_color: (item as Lead).priority_color || undefined,
    urgency: item.urgency || undefined,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
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

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const now = new Date().toISOString();

    const [leadsQuery, jobsQuery, prefsQuery] = await Promise.all([
      (async () => {
        let query = adminClient
          .from('leads')
          .select('*')
          .eq('user_id', user.id)
          .not('status', 'in', '("converted","lost")')
          .order('created_at', { ascending: false });

        if (!includeGray) {
          query = query.neq('priority_color', 'gray');
        }

        if (!includeSnoozed) {
          query = query.or(`remind_at.is.null,remind_at.lte.${now}`);
        }

        return query;
      })(),
      adminClient
        .from('jobs')
        .select('*')
        .eq('user_id', user.id)
        .or('status.eq.new,needs_action.eq.true')
        .order('created_at', { ascending: false }),
      adminClient
        .from('operator_notification_preferences')
        .select('getting_cold_threshold_hours')
        .eq('user_id', user.id)
        .single(),
    ]);

    if (leadsQuery.error) {
      console.error('Error fetching leads:', leadsQuery.error);
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
    }

    if (jobsQuery.error) {
      console.error('Error fetching jobs:', jobsQuery.error);
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
    }

    const gettingColdThresholdHours = 
      prefsQuery.data?.getting_cold_threshold_hours ?? DEFAULT_GETTING_COLD_THRESHOLD_HOURS;

    const leads = leadsQuery.data || [];
    const jobs = jobsQuery.data || [];

    const leadIds = leads.map((l) => l.id);
    const { data: allNotes } = leadIds.length > 0
      ? await adminClient
          .from('operator_notes')
          .select('*')
          .in('lead_id', leadIds)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
      : { data: [] };

    const notesMap = new Map<string, OperatorNote[]>();
    for (const note of allNotes || []) {
      if (note.lead_id) {
        const existing = notesMap.get(note.lead_id) || [];
        existing.push(note);
        notesMap.set(note.lead_id, existing);
      }
    }

    const leadItems: NowItem[] = leads.map((lead) =>
      transformToNowItem(lead, 'lead', gettingColdThresholdHours, notesMap.get(lead.id))
    );

    const jobItems: NowItem[] = jobs.map((job) =>
      transformToNowItem(job, 'job', gettingColdThresholdHours)
    );

    const allItems = [...leadItems, ...jobItems];

    const sortedItems = sortByUrgency(
      [...leads, ...jobs],
      gettingColdThresholdHours
    ).map((item) => {
      const found = allItems.find((i) => i.id === item.id);
      return found!;
    }).filter(Boolean);

    const counts = countByUrgencyTier([...leads, ...jobs], gettingColdThresholdHours);

    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const pendingOutcomeLead = leads.find(
      (lead) => lead.last_call_tapped_at && lead.last_call_tapped_at > thirtyMinutesAgo
    );

    const pendingOutcome = pendingOutcomeLead
      ? transformToNowItem(
          pendingOutcomeLead,
          'lead',
          gettingColdThresholdHours,
          notesMap.get(pendingOutcomeLead.id)
        )
      : null;

    const response: NowResponse = {
      items: sortedItems,
      counts,
      pendingOutcome,
      settings: {
        gettingColdThresholdHours,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Velocity API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
