import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { Lead, Job } from '@/types/database';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Unified history item combining leads and jobs
export interface HistoryItem {
  id: string;
  type: 'lead' | 'job';
  customer_name: string;
  customer_phone: string;
  customer_address: string | null;
  issue_description: string | null;
  ai_summary: string | null;
  status: string;
  outcome: 'booked' | 'completed' | 'lost' | 'cancelled';
  outcome_reason: string | null;
  priority_color: string | null;
  revenue_tier_label: string | null;
  estimated_value: number | null;
  actual_revenue: number | null;
  scheduled_at: string | null;
  completed_at: string | null;
  created_at: string;
  // Original record for detail view
  original: Lead | Job;
}

export interface HistoryResponse {
  items: HistoryItem[];
  total: number;
  hasMore: boolean;
  stats: {
    booked: number;
    completed: number;
    lost: number;
    cancelled: number;
    totalRevenue: number;
  };
}

/**
 * GET /api/history
 *
 * Returns historical records - completed/cancelled jobs and converted/lost leads.
 * Supports search, filtering, and pagination.
 *
 * Query params:
 * - search: Search by name, phone, or address
 * - filter: 'all' | 'booked' | 'completed' | 'lost' | 'cancelled'
 * - startDate: Filter from date (ISO string)
 * - endDate: Filter to date (ISO string)
 * - limit: Number of items per page (default 20, max 100)
 * - offset: Pagination offset (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase().trim();
    const filter = searchParams.get('filter') || 'all';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

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

    // Fetch converted and lost leads
    let leadsQuery = adminClient
      .from('leads')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['converted', 'lost']);

    // Fetch completed and cancelled jobs
    let jobsQuery = adminClient
      .from('jobs')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['complete', 'cancelled']);

    // Apply date filters
    if (startDate) {
      leadsQuery = leadsQuery.gte('created_at', startDate);
      jobsQuery = jobsQuery.gte('created_at', startDate);
    }
    if (endDate) {
      leadsQuery = leadsQuery.lte('created_at', endDate);
      jobsQuery = jobsQuery.lte('created_at', endDate);
    }

    // Execute queries
    const [leadsResult, jobsResult] = await Promise.all([
      leadsQuery.order('created_at', { ascending: false }),
      jobsQuery.order('created_at', { ascending: false }),
    ]);

    if (leadsResult.error) {
      console.error('Error fetching leads:', leadsResult.error);
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
    }

    if (jobsResult.error) {
      console.error('Error fetching jobs:', jobsResult.error);
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
    }

    // Transform leads to history items
    const leadItems: HistoryItem[] = (leadsResult.data || []).map((lead: Lead) => ({
      id: lead.id,
      type: 'lead' as const,
      customer_name: lead.customer_name,
      customer_phone: lead.customer_phone,
      customer_address: lead.customer_address,
      issue_description: lead.issue_description,
      ai_summary: lead.ai_summary,
      status: lead.status,
      outcome: lead.status === 'converted' ? 'booked' : 'lost',
      outcome_reason: lead.status === 'lost' ? lead.lost_reason : null,
      priority_color: lead.priority_color,
      revenue_tier_label: lead.revenue_tier_label,
      estimated_value: lead.estimated_value,
      actual_revenue: null,
      scheduled_at: null,
      completed_at: lead.status === 'converted' ? lead.converted_at : lead.lost_at,
      created_at: lead.created_at,
      original: lead,
    }));

    // Transform jobs to history items
    const jobItems: HistoryItem[] = (jobsResult.data || []).map((job: Job) => ({
      id: job.id,
      type: 'job' as const,
      customer_name: job.customer_name,
      customer_phone: job.customer_phone,
      customer_address: job.customer_address,
      issue_description: null,
      ai_summary: job.ai_summary,
      status: job.status,
      outcome: job.status === 'complete' ? 'completed' : 'cancelled',
      outcome_reason: null,
      priority_color: job.priority_color,
      revenue_tier_label: job.revenue_tier_label,
      estimated_value: job.estimated_value,
      actual_revenue: job.revenue,
      scheduled_at: job.scheduled_at,
      completed_at: job.status === 'complete' ? job.completed_at : job.cancelled_at,
      created_at: job.created_at,
      original: job,
    }));

    // Combine and sort by completed_at or created_at (newest first)
    let allItems = [...leadItems, ...jobItems].sort((a, b) => {
      const aDate = a.completed_at || a.created_at;
      const bDate = b.completed_at || b.created_at;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });

    // Apply search filter
    if (search) {
      allItems = allItems.filter(item => {
        const searchFields = [
          item.customer_name,
          item.customer_phone,
          item.customer_address,
          item.issue_description,
          item.ai_summary,
        ].filter(Boolean).map(f => f!.toLowerCase());

        return searchFields.some(field => field.includes(search));
      });
    }

    // Apply outcome filter
    if (filter !== 'all') {
      allItems = allItems.filter(item => item.outcome === filter);
    }

    // Calculate stats from filtered items (before pagination)
    const stats = {
      booked: allItems.filter(i => i.outcome === 'booked').length,
      completed: allItems.filter(i => i.outcome === 'completed').length,
      lost: allItems.filter(i => i.outcome === 'lost').length,
      cancelled: allItems.filter(i => i.outcome === 'cancelled').length,
      totalRevenue: allItems.reduce((sum, i) => sum + (i.actual_revenue || 0), 0),
    };

    const total = allItems.length;

    // Apply pagination
    const paginatedItems = allItems.slice(offset, offset + limit);

    const response: HistoryResponse = {
      items: paginatedItems,
      total,
      hasMore: offset + limit < total,
      stats,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('History API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
