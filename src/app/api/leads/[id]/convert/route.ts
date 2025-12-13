import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { findOrCreateCustomer } from '@/lib/customers';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface ConvertLeadBody {
  scheduled_at: string;
  estimated_value?: number;
  cal_com_booking_uid?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: ConvertLeadBody = await request.json();

    if (!body.scheduled_at) {
      return NextResponse.json({ error: 'scheduled_at is required' }, { status: 400 });
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

    const adminClient = createAdminClient();

    // Get the lead
    const { data: lead, error: leadError } = await adminClient
      .from('leads')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (lead.status === 'converted') {
      return NextResponse.json({ error: 'Lead already converted' }, { status: 400 });
    }

    // Find or create customer record
    const customerId = await findOrCreateCustomer(adminClient, user.id, {
      name: lead.customer_name,
      phone: lead.customer_phone,
      address: lead.customer_address || undefined,
    });

    // Create a job from the lead
    const { data: job, error: jobError } = await adminClient
      .from('jobs')
      .insert({
        user_id: user.id,
        customer_id: customerId,
        customer_name: lead.customer_name,
        customer_phone: lead.customer_phone,
        customer_address: lead.customer_address || 'Address pending',
        service_type: lead.service_type || 'hvac',
        urgency: lead.urgency || 'medium',
        ai_summary: lead.issue_description || lead.ai_summary,
        call_transcript: lead.call_transcript,
        scheduled_at: body.scheduled_at,
        estimated_value: body.estimated_value || lead.estimated_value,
        status: 'confirmed',
        needs_action: false,
        cal_com_booking_uid: body.cal_com_booking_uid || null,
        is_ai_booked: false,
        booking_confirmed: true,
      })
      .select()
      .single();

    if (jobError || !job) {
      console.error('Error creating job from lead:', jobError);
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
    }

    // Update the lead as converted
    const { error: updateError } = await adminClient
      .from('leads')
      .update({
        status: 'converted',
        converted_job_id: job.id,
        converted_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating lead status:', updateError);
      // Job was created but lead update failed - not critical
    }

    return NextResponse.json({
      success: true,
      job_id: job.id,
      lead_id: id,
    });
  } catch (error) {
    console.error('Convert lead error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
