import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { findOrCreateCustomer } from '@/lib/customers';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const CAL_COM_API_KEY = process.env.CAL_COM_API_KEY;
const CAL_COM_EVENT_TYPE_ID = process.env.CAL_COM_EVENT_TYPE_ID || '3877847';
const CAL_API_BASE = 'https://api.cal.com/v2';

interface BookLeadRequest {
  dateTime: string;
  date: string;
  time: string;
}

interface CalComBookingResponse {
  status: string;
  data: {
    uid: string;
    title: string;
    startTime: string;
    endTime: string;
  };
}

async function createCalComBooking(
  dateTime: string,
  customerName: string,
  customerPhone: string,
  customerAddress?: string,
  issueDescription?: string
): Promise<{ success: boolean; bookingUid?: string; error?: string }> {
  if (!CAL_COM_API_KEY) {
    const mockUid = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('Cal.com not configured, using mock booking:', mockUid);
    return { success: true, bookingUid: mockUid };
  }

  const bookingData = {
    eventTypeId: parseInt(CAL_COM_EVENT_TYPE_ID),
    start: dateTime,
    attendee: {
      name: customerName,
      email: `${customerPhone.replace(/\D/g, '')}@phone.calllock.ai`,
      timeZone: 'America/Detroit',
    },
    metadata: {
      phone: customerPhone,
      address: customerAddress || '',
      problemDescription: issueDescription || '',
      bookedBy: 'dashboard_tile_view',
    },
  };

  try {
    const response = await fetch(`${CAL_API_BASE}/bookings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CAL_COM_API_KEY}`,
        'cal-api-version': '2024-08-13',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bookingData),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Cal.com booking error:', response.status, error);
      return { success: false, error: `Cal.com error: ${response.status}` };
    }

    const data = await response.json() as CalComBookingResponse;
    console.log('Cal.com booking created:', data.data.uid);
    return { success: true, bookingUid: data.data.uid };
  } catch (error) {
    console.error('Cal.com booking error:', error);
    return { success: false, error: 'Failed to create Cal.com booking' };
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: BookLeadRequest = await request.json();

    if (!body.dateTime) {
      return NextResponse.json({ error: 'dateTime is required' }, { status: 400 });
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();

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
      return NextResponse.json({ error: 'Lead already booked' }, { status: 400 });
    }

    const calResult = await createCalComBooking(
      body.dateTime,
      lead.customer_name,
      lead.customer_phone,
      lead.customer_address,
      lead.issue_description || lead.ai_summary
    );

    if (!calResult.success) {
      return NextResponse.json({ 
        error: 'Failed to create calendar booking',
        details: calResult.error 
      }, { status: 500 });
    }

    const customerId = await findOrCreateCustomer(adminClient, user.id, {
      name: lead.customer_name,
      phone: lead.customer_phone,
      address: lead.customer_address || undefined,
    });

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
        scheduled_at: body.dateTime,
        estimated_value: lead.estimated_value,
        status: 'confirmed',
        needs_action: false,
        cal_com_booking_uid: calResult.bookingUid,
        is_ai_booked: false,
        booking_confirmed: true,
        original_call_id: lead.original_call_id,
      })
      .select()
      .single();

    if (jobError || !job) {
      console.error('Error creating job from lead:', jobError);
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
    }

    const { error: updateError } = await adminClient
      .from('leads')
      .update({
        status: 'converted',
        callback_outcome: 'booked',
        callback_outcome_at: new Date().toISOString(),
        converted_job_id: job.id,
        converted_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating lead status:', updateError);
    }

    const scheduledDate = new Date(body.dateTime);
    const dateStr = scheduledDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    const timeStr = scheduledDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    return NextResponse.json({
      success: true,
      job_id: job.id,
      lead_id: id,
      booking_uid: calResult.bookingUid,
      message: `Appointment confirmed for ${dateStr} at ${timeStr}`,
    });
  } catch (error) {
    console.error('Book lead error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
