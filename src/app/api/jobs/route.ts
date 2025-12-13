import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { findOrCreateCustomer } from '@/lib/customers';
import type { ServiceType, UrgencyLevel } from '@/types/database';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xboybmqtwsxmdokgzclk.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhib3libXF0d3N4bWRva2d6Y2xrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2ODc3NDUsImV4cCI6MjA4MDI2Mzc0NX0.wGxgfhegig_QPnKu8cGMpYgiP7LdTMeRl4RF93SPeM0';
const CAL_COM_API_KEY = process.env.CAL_COM_API_KEY;
const CAL_COM_EVENT_TYPE_ID = process.env.CAL_COM_EVENT_TYPE_ID || '3877847';
const CAL_API_BASE = 'https://api.cal.com/v2';

interface CreateJobRequest {
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  service_type: ServiceType;
  urgency: UrgencyLevel;
  scheduled_at: string;
  notes?: string;
  estimated_value?: number;
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const needsAction = searchParams.get('needs_action');

  // Get user from session cookies
  const cookieStore = await cookies();
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // Not needed for read-only operations
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Use service role to bypass RLS
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const adminClient = createClient(SUPABASE_URL, serviceKey);

  // Build query
  let query = adminClient
    .from('jobs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // Apply filters
  if (needsAction === 'true') {
    query = query.eq('needs_action', true).not('status', 'in', '("complete","cancelled")');
  } else if (status) {
    query = query.eq('status', status);
  }

  const { data: jobs, error } = await query.limit(50);

  if (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
  }

  // Get user timezone
  const { data: profile } = await adminClient
    .from('users')
    .select('timezone')
    .eq('id', user.id)
    .single();

  return NextResponse.json({
    jobs: jobs || [],
    timezone: profile?.timezone || 'America/New_York',
  });
}

/**
 * POST /api/jobs
 * Create a new job manually (for walk-ins, direct calls, referrals)
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
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

    const body: CreateJobRequest = await request.json();

    // Validate required fields
    if (!body.customer_name || body.customer_name.trim().length < 2) {
      return NextResponse.json({ error: 'Customer name is required (min 2 characters)' }, { status: 400 });
    }
    if (!body.customer_phone || body.customer_phone.trim().length < 10) {
      return NextResponse.json({ error: 'Valid phone number is required' }, { status: 400 });
    }
    if (!body.customer_address || body.customer_address.trim().length < 5) {
      return NextResponse.json({ error: 'Service address is required (min 5 characters)' }, { status: 400 });
    }
    if (!body.service_type) {
      return NextResponse.json({ error: 'Service type is required' }, { status: 400 });
    }
    if (!body.urgency) {
      return NextResponse.json({ error: 'Urgency is required' }, { status: 400 });
    }
    if (!body.scheduled_at) {
      return NextResponse.json({ error: 'Scheduled date/time is required' }, { status: 400 });
    }

    // Validate scheduled_at is in the future
    const scheduledDate = new Date(body.scheduled_at);
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date/time format' }, { status: 400 });
    }
    if (scheduledDate < new Date()) {
      return NextResponse.json({ error: 'Scheduled time must be in the future' }, { status: 400 });
    }

    // Use service role for database operations
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const adminClient = createClient(SUPABASE_URL, serviceKey);

    // Step 1: Create Cal.com booking
    let bookingUid: string | null = null;

    if (CAL_COM_API_KEY) {
      const bookingData = {
        eventTypeId: parseInt(CAL_COM_EVENT_TYPE_ID),
        start: body.scheduled_at,
        attendee: {
          name: body.customer_name,
          email: `${body.customer_phone.replace(/\D/g, '')}@phone.calllock.ai`,
          timeZone: 'America/Chicago',
        },
        metadata: {
          phone: body.customer_phone,
          address: body.customer_address,
          serviceType: body.service_type,
          urgency: body.urgency,
          problemDescription: body.notes || '',
          bookedBy: 'dashboard_manual',
        },
      };

      console.log('Creating Cal.com booking for manual job:', {
        eventTypeId: CAL_COM_EVENT_TYPE_ID,
        dateTime: body.scheduled_at,
        customerName: body.customer_name,
      });

      const calResponse = await fetch(`${CAL_API_BASE}/bookings`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${CAL_COM_API_KEY}`,
          'cal-api-version': '2024-08-13',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });

      if (!calResponse.ok) {
        const error = await calResponse.text();
        console.error('Cal.com booking error:', calResponse.status, error);
        return NextResponse.json({
          error: 'Failed to create calendar booking',
          details: error,
        }, { status: 500 });
      }

      const calData = await calResponse.json() as CalComBookingResponse;
      bookingUid = calData.data.uid;
      console.log('Cal.com booking created:', bookingUid);
    } else {
      // Mock booking for development
      bookingUid = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('Cal.com not configured, using mock booking:', bookingUid);
    }

    // Step 2: Find or create customer
    const customerId = await findOrCreateCustomer(adminClient, user.id, {
      name: body.customer_name,
      phone: body.customer_phone,
      address: body.customer_address,
    });

    // Step 3: Create the job
    const { data: job, error: jobError } = await adminClient
      .from('jobs')
      .insert({
        user_id: user.id,
        customer_name: body.customer_name.trim(),
        customer_phone: body.customer_phone.trim(),
        customer_address: body.customer_address.trim(),
        service_type: body.service_type,
        urgency: body.urgency,
        scheduled_at: body.scheduled_at,
        ai_summary: body.notes?.trim() || null,
        estimated_value: body.estimated_value || null,
        status: 'confirmed',
        is_ai_booked: false,
        booking_confirmed: true,
        cal_com_booking_uid: bookingUid,
        customer_id: customerId,
        needs_action: false,
      })
      .select()
      .single();

    if (jobError) {
      console.error('Error creating job:', jobError);
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
    }

    // Format success message
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
      job,
      message: `Job created for ${dateStr} at ${timeStr}`,
    });
  } catch (error) {
    console.error('Create job error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
