import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import type { Job } from '@/types/database';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const CAL_COM_API_KEY = process.env.CAL_COM_API_KEY;
const CAL_API_BASE = 'https://api.cal.com/v2';

interface RescheduleRequest {
  newDateTime: string;  // ISO datetime
  reason?: string;      // Optional reschedule reason
}

interface RescheduleResponse {
  success: boolean;
  job?: Job;
  calcom_updated: boolean;
  message: string;
}

/**
 * Reschedule a booking via Cal.com v2 API
 * Based on retellai-calllock/src/services/calcom.ts pattern
 */
async function rescheduleCalComBooking(
  bookingUid: string,
  newStartTime: string,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  if (!CAL_COM_API_KEY) {
    console.warn('Cal.com API key not configured');
    return { success: false, message: 'Calendar service not configured' };
  }

  try {
    console.log('Rescheduling Cal.com booking:', { bookingUid, newStartTime });

    const response = await fetch(
      `${CAL_API_BASE}/bookings/${bookingUid}/reschedule`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${CAL_COM_API_KEY}`,
          'cal-api-version': '2024-08-13',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start: newStartTime,
          ...(reason && { reschedulingReason: reason }),
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Cal.com reschedule error:', response.status, error);
      return { success: false, message: 'Unable to reschedule calendar booking' };
    }

    // Format confirmation message
    const newDate = new Date(newStartTime);
    const formattedDate = newDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = newDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    console.log('Cal.com booking rescheduled successfully:', { bookingUid, newStartTime });
    return {
      success: true,
      message: `Appointment rescheduled to ${formattedDate} at ${formattedTime}`,
    };
  } catch (error) {
    console.error('Cal.com reschedule error:', error);
    return { success: false, message: 'Error rescheduling booking' };
  }
}

/**
 * POST /api/jobs/[id]/reschedule
 * Reschedule a job to a new date/time
 *
 * Body:
 * - newDateTime: ISO datetime string (required)
 * - reason: string (optional)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<RescheduleResponse>> {
  const { id } = await params;

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
      return NextResponse.json({
        success: false,
        calcom_updated: false,
        message: 'Unauthorized'
      }, { status: 401 });
    }

    // Parse request body
    const body: RescheduleRequest = await request.json();

    // Validate required fields
    if (!body.newDateTime) {
      return NextResponse.json({
        success: false,
        calcom_updated: false,
        message: 'newDateTime is required'
      }, { status: 400 });
    }

    // Validate datetime is in the future
    const newDate = new Date(body.newDateTime);
    if (isNaN(newDate.getTime())) {
      return NextResponse.json({
        success: false,
        calcom_updated: false,
        message: 'Invalid datetime format'
      }, { status: 400 });
    }
    if (newDate < new Date()) {
      return NextResponse.json({
        success: false,
        calcom_updated: false,
        message: 'Cannot reschedule to a past date'
      }, { status: 400 });
    }

    // Use service role to bypass RLS
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      return NextResponse.json({
        success: false,
        calcom_updated: false,
        message: 'Server configuration error'
      }, { status: 500 });
    }

    const adminClient = createClient(SUPABASE_URL, serviceKey);

    // Get job (only if it belongs to the user)
    const { data: job, error: jobError } = await adminClient
      .from('jobs')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({
        success: false,
        calcom_updated: false,
        message: 'Job not found'
      }, { status: 404 });
    }

    // Validate job can be rescheduled
    if (job.status === 'complete' || job.status === 'cancelled') {
      return NextResponse.json({
        success: false,
        calcom_updated: false,
        message: `Cannot reschedule a ${job.status} job`
      }, { status: 400 });
    }

    if (job.status === 'en_route' || job.status === 'on_site') {
      return NextResponse.json({
        success: false,
        calcom_updated: false,
        message: 'Cannot reschedule a job that is already in progress'
      }, { status: 400 });
    }

    // Try to reschedule in Cal.com if booking UID exists
    let calcomUpdated = false;
    if (job.cal_com_booking_uid) {
      const calResult = await rescheduleCalComBooking(
        job.cal_com_booking_uid,
        body.newDateTime,
        body.reason
      );
      calcomUpdated = calResult.success;

      // If Cal.com sync fails, don't update local DB to keep in sync
      if (!calResult.success) {
        return NextResponse.json({
          success: false,
          calcom_updated: false,
          message: calResult.message || 'Failed to update calendar booking'
        }, { status: 500 });
      }
    }

    // Update job in database
    const { data: updatedJob, error: updateError } = await adminClient
      .from('jobs')
      .update({
        scheduled_at: body.newDateTime,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Job update error:', updateError);
      return NextResponse.json({
        success: false,
        calcom_updated: calcomUpdated,
        message: 'Failed to update job'
      }, { status: 500 });
    }

    // Format success message
    const formattedDate = newDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = newDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const message = calcomUpdated
      ? `Job rescheduled to ${formattedDate} at ${formattedTime}. Customer calendar updated.`
      : `Job rescheduled to ${formattedDate} at ${formattedTime}. Note: No calendar invite was updated (job was not booked via Cal.com).`;

    return NextResponse.json({
      success: true,
      job: updatedJob,
      calcom_updated: calcomUpdated,
      message,
    });
  } catch (error) {
    console.error('Reschedule error:', error);
    return NextResponse.json({
      success: false,
      calcom_updated: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}
