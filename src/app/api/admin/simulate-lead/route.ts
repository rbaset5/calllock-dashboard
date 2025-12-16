import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { LeadStatus, LeadPriority, UrgencyLevel, ServiceType } from '@/types/database';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// V4 Priority Colors
type PriorityColor = 'red' | 'green' | 'blue' | 'gray';

interface SimulateLeadRequest {
  // Required
  customer_name: string;
  customer_phone: string;
  issue_description: string;

  // Optional with defaults
  customer_address?: string;
  status?: LeadStatus;
  priority?: LeadPriority;
  priority_color?: PriorityColor;
  priority_reason?: string;
  urgency?: UrgencyLevel;
  service_type?: ServiceType;
  ai_summary?: string;
  why_not_booked?: string;

  // Revenue tier
  revenue_tier?: string;
  revenue_tier_label?: string;
  revenue_tier_signals?: string[];
  estimated_value?: number;

  // Diagnostic context
  problem_duration?: string;
  problem_onset?: string;
  problem_pattern?: string;
  customer_attempted_fixes?: string;

  // Time preference (for slot picker)
  time_preference?: string;
}

// Predefined test scenarios for quick testing
const TEST_SCENARIOS: Record<string, Partial<SimulateLeadRequest>> = {
  // RED priority - Callback risk
  callback_risk: {
    customer_name: 'Robert Chen',
    customer_phone: '+15551234001',
    customer_address: '456 Oak Ave, Austin TX 78701',
    issue_description: 'AC broke again. This is the third time this month. I want to speak to a manager.',
    status: 'callback_requested',
    priority: 'hot',
    priority_color: 'red',
    priority_reason: 'Customer mentioned "third time" and requested manager - callback risk',
    urgency: 'high',
    service_type: 'hvac',
    ai_summary: 'Repeat customer with ongoing AC issues. Expressed frustration about recurring problems.',
    why_not_booked: 'Customer demanded to speak with owner/manager before scheduling',
    revenue_tier: 'major_repair',
    revenue_tier_label: '$$$',
    revenue_tier_signals: ['repeat issue', 'possibly needs compressor'],
    estimated_value: 1500,
  },

  // GREEN priority - Commercial high value
  commercial: {
    customer_name: 'Sunset Plaza Management',
    customer_phone: '+15551234002',
    customer_address: '789 Commerce Blvd, Austin TX 78702',
    issue_description: 'Leasing office AC is down. We have clients coming in all day. Need someone ASAP.',
    status: 'callback_requested',
    priority: 'hot',
    priority_color: 'green',
    priority_reason: 'Commercial property management - high value opportunity',
    urgency: 'emergency',
    service_type: 'hvac',
    ai_summary: 'Commercial leasing office with urgent AC failure. Multiple client meetings scheduled.',
    why_not_booked: 'Caller requested callback to discuss emergency service rates',
    revenue_tier: 'replacement',
    revenue_tier_label: '$$$$',
    revenue_tier_signals: ['commercial', 'urgent', 'leasing office'],
    estimated_value: 8000,
  },

  // BLUE priority - Standard residential
  standard: {
    customer_name: 'Maria Garcia',
    customer_phone: '+15551234003',
    customer_address: '123 Elm Street, Austin TX 78703',
    issue_description: 'My AC is making a weird noise when it starts up. Not cooling as well as it used to.',
    status: 'callback_requested',
    priority: 'warm',
    priority_color: 'blue',
    priority_reason: 'Standard residential service request',
    urgency: 'medium',
    service_type: 'hvac',
    ai_summary: 'Residential AC noise issue with reduced cooling performance. Likely capacitor or fan motor.',
    why_not_booked: 'Customer wanted to check schedule before committing to a time',
    revenue_tier: 'standard_repair',
    revenue_tier_label: '$$',
    revenue_tier_signals: ['noise', 'reduced cooling', 'startup issue'],
    estimated_value: 350,
    time_preference: 'tomorrow afternoon',
    problem_duration: '2 weeks',
    problem_pattern: 'Gets louder in the afternoon',
  },

  // GRAY priority - Spam/vendor
  spam: {
    customer_name: 'Home Warranty Sales',
    customer_phone: '+15551234004',
    customer_address: '',
    issue_description: 'Hi, I\'m calling about your home warranty. We have a special offer for HVAC contractors.',
    status: 'abandoned',
    priority: 'cold',
    priority_color: 'gray',
    priority_reason: 'Sales call detected - vendor/solicitation',
    urgency: 'low',
    service_type: 'general',
    ai_summary: 'Solicitation call from home warranty sales company.',
    why_not_booked: 'Not a customer - sales call',
  },

  // Abandoned call (true missed call)
  abandoned: {
    customer_name: 'Unknown Caller',
    customer_phone: '+15551234005',
    customer_address: '',
    issue_description: 'Customer hung up before providing details.',
    status: 'abandoned',
    priority: 'hot',
    priority_color: 'red',
    priority_reason: 'Customer hung up - may call competitor',
    urgency: 'high',
    service_type: 'hvac',
    ai_summary: 'Customer disconnected before AI could gather information. Potential lost lead.',
    why_not_booked: 'Call ended prematurely',
  },

  // Sales opportunity (replacement signal)
  sales_opportunity: {
    customer_name: 'James Wilson',
    customer_phone: '+15551234006',
    customer_address: '567 Pine Road, Austin TX 78704',
    issue_description: 'My AC unit is 18 years old and uses R-22 Freon. Tech said it might be time for a new one.',
    status: 'sales_opportunity',
    priority: 'hot',
    priority_color: 'green',
    priority_reason: 'Replacement opportunity - R-22 system, 18+ years old',
    urgency: 'medium',
    service_type: 'hvac',
    ai_summary: 'Older R-22 system reaching end of life. Customer aware of replacement need.',
    why_not_booked: 'Customer wants estimate for replacement options',
    revenue_tier: 'replacement',
    revenue_tier_label: '$$$$',
    revenue_tier_signals: ['R-22', '18 years old', 'replacement inquiry'],
    estimated_value: 12000,
    equipment_type: 'Central AC',
    equipment_age: '18 years',
    sales_lead_notes: 'Customer has been told R-22 is being phased out. Interested in energy-efficient options.',
  },
};

/**
 * POST /api/admin/simulate-lead
 *
 * Creates a test lead for development/staging environments.
 * Only works when NEXT_PUBLIC_ENV is 'staging' or 'development'.
 *
 * Body options:
 * - scenario: string - Use a predefined scenario (callback_risk, commercial, standard, spam, abandoned, sales_opportunity)
 * - Or provide custom lead data
 */
export async function POST(request: NextRequest) {
  try {
    // Check environment - only allow in staging/development
    const env = process.env.NEXT_PUBLIC_ENV || 'production';
    if (env === 'production') {
      return NextResponse.json(
        { error: 'Simulate lead endpoint is only available in staging/development' },
        { status: 403 }
      );
    }

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

    const body = await request.json();

    // If scenario is provided, use predefined data
    let leadData: Partial<SimulateLeadRequest>;
    if (body.scenario && TEST_SCENARIOS[body.scenario]) {
      leadData = { ...TEST_SCENARIOS[body.scenario], ...body };
      delete (leadData as any).scenario;
    } else {
      leadData = body;
    }

    // Validate required fields
    if (!leadData.customer_name || !leadData.customer_phone || !leadData.issue_description) {
      return NextResponse.json(
        { error: 'Missing required fields: customer_name, customer_phone, issue_description' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Generate unique phone if using test scenario (to avoid duplicates)
    const uniquePhone = leadData.customer_phone?.replace(/\d{3}$/, String(Date.now()).slice(-3));

    // Create the lead
    const { data: lead, error: insertError } = await adminClient
      .from('leads')
      .insert({
        user_id: user.id,
        customer_name: leadData.customer_name,
        customer_phone: uniquePhone || leadData.customer_phone,
        customer_address: leadData.customer_address || null,
        status: leadData.status || 'callback_requested',
        priority: leadData.priority || 'warm',
        priority_color: leadData.priority_color || 'blue',
        priority_reason: leadData.priority_reason || null,
        urgency: leadData.urgency || 'medium',
        service_type: leadData.service_type || 'hvac',
        issue_description: leadData.issue_description,
        ai_summary: leadData.ai_summary || leadData.issue_description,
        why_not_booked: leadData.why_not_booked || 'Simulated test lead',
        revenue_tier: leadData.revenue_tier || null,
        revenue_tier_label: leadData.revenue_tier_label || null,
        revenue_tier_signals: leadData.revenue_tier_signals || null,
        estimated_value: leadData.estimated_value || null,
        problem_duration: leadData.problem_duration || null,
        problem_onset: leadData.problem_onset || null,
        problem_pattern: leadData.problem_pattern || null,
        customer_attempted_fixes: leadData.customer_attempted_fixes || null,
        time_preference: leadData.time_preference || null,
        equipment_type: leadData.equipment_type || null,
        equipment_age: leadData.equipment_age || null,
        sales_lead_notes: leadData.sales_lead_notes || null,
        callback_requested_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating simulated lead:', insertError);
      return NextResponse.json(
        { error: 'Failed to create lead', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Test lead created successfully',
      lead,
      scenario: body.scenario || 'custom',
    });

  } catch (error) {
    console.error('Simulate lead API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/admin/simulate-lead
 *
 * Returns available test scenarios
 */
export async function GET() {
  const env = process.env.NEXT_PUBLIC_ENV || 'production';
  if (env === 'production') {
    return NextResponse.json(
      { error: 'Simulate lead endpoint is only available in staging/development' },
      { status: 403 }
    );
  }

  return NextResponse.json({
    available_scenarios: Object.keys(TEST_SCENARIOS),
    scenarios: Object.entries(TEST_SCENARIOS).map(([key, value]) => ({
      name: key,
      priority_color: value.priority_color,
      description: value.ai_summary,
    })),
    usage: {
      create_from_scenario: 'POST /api/admin/simulate-lead { "scenario": "callback_risk" }',
      create_custom: 'POST /api/admin/simulate-lead { "customer_name": "...", "customer_phone": "...", "issue_description": "..." }',
    },
  });
}
