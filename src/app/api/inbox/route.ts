import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { Lead, SmsAlertContext } from '@/types/database';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Items older than 3 days are considered stale
const STALE_THRESHOLD_DAYS = 3;

export type InboxItemType = 'lead' | 'alert';

export interface InboxItem {
  id: string;
  type: InboxItemType;
  customer_name: string;
  customer_phone: string;
  description: string;
  status: string;
  urgency?: string;
  priority?: string;
  created_at: string;
  age_days: number;
  is_stale: boolean;
  estimated_value?: number;
  revenue_tier?: string;
  alert_type?: string;
  // V3 Triage fields
  caller_type?: 'residential' | 'commercial' | 'vendor' | 'recruiting' | 'unknown';
  primary_intent?: 'new_lead' | 'active_job_issue' | 'booking_request' | 'admin_billing' | 'solicitation';
  is_callback_complaint?: boolean;
  status_color?: 'red' | 'green' | 'yellow' | 'blue' | 'gray';
  is_archived?: boolean;
  // Original data for detail views
  lead?: Lead;
  alert?: SmsAlertContext;
}

export interface InboxResponse {
  items: InboxItem[];
  stale: InboxItem[];
  today: InboxItem[];
  counts: {
    total: number;
    stale: number;
    callbacks: number;
    quotes: number;
    alerts: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter'); // 'all' | 'stale' | 'callbacks' | 'quotes' | 'alerts'

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
    const now = new Date();
    const staleThreshold = new Date(now.getTime() - STALE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Fetch leads that need action (exclude archived/spam)
    const { data: leads, error: leadsError } = await adminClient
      .from('leads')
      .select('*')
      .eq('user_id', user.id)
      .not('status', 'in', '("converted","lost")')
      .or('is_archived.is.null,is_archived.eq.false')  // V3: Exclude archived/spam
      .or('remind_at.is.null,remind_at.lte.' + now.toISOString())
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false });

    if (leadsError) {
      console.error('Error fetching leads:', leadsError);
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
    }

    // Fetch pending alerts - try without user_id filter as schema may vary
    let alerts: SmsAlertContext[] = [];
    try {
      const { data: alertData, error: alertsError } = await adminClient
        .from('sms_alert_context')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (alertsError) {
        console.error('Error fetching alerts:', alertsError);
        // Continue without alerts rather than failing the whole request
      } else {
        alerts = alertData || [];
      }
    } catch (e) {
      console.error('Error fetching alerts:', e);
      // Continue without alerts
    }

    // Transform leads to inbox items
    const leadItems: InboxItem[] = (leads || []).map(lead => {
      const createdAt = new Date(lead.created_at);
      const ageDays = Math.floor((now.getTime() - createdAt.getTime()) / (24 * 60 * 60 * 1000));

      return {
        id: lead.id,
        type: 'lead' as InboxItemType,
        customer_name: lead.customer_name,
        customer_phone: lead.customer_phone,
        description: lead.issue_description || 'No description',
        status: lead.status,
        urgency: lead.urgency,
        priority: lead.priority,
        created_at: lead.created_at,
        age_days: ageDays,
        is_stale: createdAt < staleThreshold,
        estimated_value: lead.estimated_value,
        revenue_tier: lead.revenue_tier,
        // V3 Triage fields
        caller_type: lead.caller_type,
        primary_intent: lead.primary_intent,
        is_callback_complaint: lead.is_callback_complaint,
        status_color: lead.status_color,
        is_archived: lead.is_archived,
        lead,
      };
    });

    // Transform alerts to inbox items
    const alertItems: InboxItem[] = alerts.map(alert => {
      const createdAt = new Date(alert.created_at);
      const ageDays = Math.floor((now.getTime() - createdAt.getTime()) / (24 * 60 * 60 * 1000));

      return {
        id: alert.id,
        type: 'alert' as InboxItemType,
        customer_name: alert.customer_name || alert.customer_phone || 'Unknown',
        customer_phone: alert.customer_phone || '',
        description: `${alert.alert_type} Alert`,
        status: alert.status,
        created_at: alert.created_at,
        age_days: ageDays,
        is_stale: createdAt < staleThreshold,
        alert_type: alert.alert_type,
        alert,
      };
    });

    // Combine and sort all items
    let allItems = [...leadItems, ...alertItems];

    // Apply filter
    if (filter === 'spam') {
      // V3: Spam view - show archived items only
      const { data: archivedLeads } = await adminClient
        .from('leads')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_archived', true)
        .order('created_at', { ascending: false });

      // Transform archived leads to inbox items
      const archivedItems: InboxItem[] = (archivedLeads || []).map(lead => {
        const createdAt = new Date(lead.created_at);
        const ageDays = Math.floor((now.getTime() - createdAt.getTime()) / (24 * 60 * 60 * 1000));
        return {
          id: lead.id,
          type: 'lead' as InboxItemType,
          customer_name: lead.customer_name,
          customer_phone: lead.customer_phone,
          description: lead.issue_description || 'No description',
          status: lead.status,
          urgency: lead.urgency,
          priority: lead.priority,
          created_at: lead.created_at,
          age_days: ageDays,
          is_stale: false,
          estimated_value: lead.estimated_value,
          revenue_tier: lead.revenue_tier,
          status_color: lead.status_color,
          is_archived: lead.is_archived,
          lead,
        };
      });

      return NextResponse.json({
        items: archivedItems,
        stale: [],
        today: [],
        counts: { total: archivedItems.length, stale: 0, callbacks: 0, quotes: 0, alerts: 0 },
      });
    } else if (filter === 'stale') {
      allItems = allItems.filter(item => item.is_stale);
    } else if (filter === 'callbacks') {
      allItems = allItems.filter(item => item.type === 'lead' && item.status === 'callback_requested');
    } else if (filter === 'quotes') {
      allItems = allItems.filter(item => item.type === 'lead' && item.status === 'thinking');
    } else if (filter === 'alerts') {
      allItems = allItems.filter(item => item.type === 'alert');
    }

    // Sort: stale items first, then by created_at descending
    allItems.sort((a, b) => {
      // Stale items come first
      if (a.is_stale && !b.is_stale) return -1;
      if (!a.is_stale && b.is_stale) return 1;
      // Then sort by age (older first within each group)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // Separate stale and today items
    const staleItems = allItems.filter(item => item.is_stale);
    const todayItems = allItems.filter(item => {
      const itemDate = new Date(item.created_at);
      return itemDate >= todayStart && !item.is_stale;
    });

    // Calculate counts
    const counts = {
      total: leadItems.length + alertItems.length,
      stale: staleItems.length,
      callbacks: leadItems.filter(i => i.status === 'callback_requested').length,
      quotes: leadItems.filter(i => i.status === 'thinking').length,
      alerts: alertItems.length,
    };

    const response: InboxResponse = {
      items: allItems,
      stale: staleItems,
      today: todayItems,
      counts,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Inbox API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
