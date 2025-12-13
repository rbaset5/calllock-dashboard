import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { SmsAlertContext, AlertStatus, AlertType, Lead, Job } from '@/types/database';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Reply code to label mapping
const REPLY_CODE_LABELS: Record<string, string> = {
  '1': 'Called',
  '2': 'Left VM',
  '3': 'Added Note',
  '4': 'Booked',
  '5': 'Lost',
};

export interface AlertWithDetails extends SmsAlertContext {
  reply_label: string | null;
  lead?: Pick<Lead, 'id' | 'customer_name' | 'customer_phone' | 'issue_description' | 'status' | 'urgency'>;
  job?: Pick<Job, 'id' | 'customer_name' | 'customer_phone' | 'ai_summary' | 'status' | 'urgency'>;
}

export interface AlertsResponse {
  alerts: AlertWithDetails[];
  counts: {
    total: number;
    pending: number;
    replied: number;
    resolved: number;
    expired: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as AlertStatus | null;
    const type = searchParams.get('type') as AlertType | null;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

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

    // Build query for alerts
    let query = adminClient
      .from('sms_alert_context')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (type) {
      query = query.eq('alert_type', type);
    }

    const { data: alerts, error: alertsError } = await query;

    if (alertsError) {
      console.error('Error fetching alerts:', alertsError);
      return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
    }

    // Get unique lead_ids and job_ids for joining data
    const leadIds = Array.from(new Set((alerts || []).filter(a => a.lead_id).map(a => a.lead_id)));
    const jobIds = Array.from(new Set((alerts || []).filter(a => a.job_id).map(a => a.job_id)));

    // Fetch related leads
    let leadsMap: Record<string, Pick<Lead, 'id' | 'customer_name' | 'customer_phone' | 'issue_description' | 'status' | 'urgency'>> = {};
    if (leadIds.length > 0) {
      const { data: leads } = await adminClient
        .from('leads')
        .select('id, customer_name, customer_phone, issue_description, status, urgency')
        .in('id', leadIds);

      if (leads) {
        leadsMap = leads.reduce((acc, lead) => {
          acc[lead.id] = lead;
          return acc;
        }, {} as typeof leadsMap);
      }
    }

    // Fetch related jobs
    let jobsMap: Record<string, Pick<Job, 'id' | 'customer_name' | 'customer_phone' | 'ai_summary' | 'status' | 'urgency'>> = {};
    if (jobIds.length > 0) {
      const { data: jobs } = await adminClient
        .from('jobs')
        .select('id, customer_name, customer_phone, ai_summary, status, urgency')
        .in('id', jobIds);

      if (jobs) {
        jobsMap = jobs.reduce((acc, job) => {
          acc[job.id] = job;
          return acc;
        }, {} as typeof jobsMap);
      }
    }

    // Enrich alerts with related data
    const enrichedAlerts: AlertWithDetails[] = (alerts || []).map(alert => ({
      ...alert,
      reply_label: alert.reply_code ? REPLY_CODE_LABELS[alert.reply_code] || null : null,
      lead: alert.lead_id ? leadsMap[alert.lead_id] : undefined,
      job: alert.job_id ? jobsMap[alert.job_id] : undefined,
    }));

    // Get counts for each status
    const { data: allAlerts } = await adminClient
      .from('sms_alert_context')
      .select('status')
      .eq('user_id', user.id);

    const counts = {
      total: allAlerts?.length || 0,
      pending: allAlerts?.filter(a => a.status === 'pending').length || 0,
      replied: allAlerts?.filter(a => a.status === 'replied').length || 0,
      resolved: allAlerts?.filter(a => a.status === 'resolved').length || 0,
      expired: allAlerts?.filter(a => a.status === 'expired').length || 0,
    };

    const response: AlertsResponse = {
      alerts: enrichedAlerts,
      counts,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Alerts API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
