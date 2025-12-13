import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import type { Job } from '@/types/database';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const CAL_COM_API_KEY = process.env.CAL_COM_API_KEY;
const CAL_API_BASE = 'https://api.cal.com/v2';

interface CancelRequest {
  reason?: string;  // Optional cancellation reason
}

interface CancelResponse {
  success: boolean;
  job?: Job;
  calcom_cancelled: boolean;
  message: string;
}

/**
 * Cancel a booking via Cal.com v2 API
 * Based on retellai-calllock/src/services/calcom.ts pattern
 */
async function cancelCalComBooking(
  bookingUid: string,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  if (!CAL_COM_API_KEY) {
    console.warn('Cal.com API key not configured');
    return { success: false, message: 'Calendar service not configured' };
  }

  try {
    console.log('Cancelling Cal.com booking:', { bookingUid, reason });

    const response = await fetch(
      `${CAL_API_BASE}/bookings/${bookingUid}/cancel`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${CAL_COM_API_KEY}`,
          'cal-api-version': '2024-08-13',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...(reason && { cancellationReason: reason }),
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Cal.com cancel error:', response.status, error);

      // If booking not found (404), it may have been already cancelled
      if (response.status === 404) {
        console.log('Booking not found in Cal.com - may already be cancelled');
        return { success: true, message: 'Booking already cancelled or not found in calendar' };
      }

      return { success: false, message: 'Unable to cancel calendar booking' };
    }

    console.log('Cal.com booking cancelled successfully:', { bookingUid });
    return {
      success: true,
      message: 'Calendar appointment cancelled',
    };
  } catch (error) {
    console.error('Cal.com cancel error:', error);
    return { success: false, message: 'Error cancelling booking' };
  }
}

/**
 * POST /api/jobs/[id]/cancel
 * Cancel a job and its Cal.com booking
 *
 * Body:
 * - reason: string (optional)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<CancelResponse>> {
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
        calcom_cancelled: false,
        message: 'Unauthorized'
      }, { status: 401 });
    }

    // Parse request body
    let body: CancelRequest = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is fine - reason is optional
    }

    // Use service role to bypass RLS
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      return NextResponse.json({
        success: false,
        calcom_cancelled: false,
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
        calcom_cancelled: false,
        message: 'Job not found'
      }, { status: 404 });
    }

    // Validate job can be cancelled
    if (job.status === 'complete') {
      return NextResponse.json({
        success: false,
        calcom_cancelled: false,
        message: 'Cannot cancel a completed job'
      }, { status: 400 });
    }

    if (job.status === 'cancelled') {
      return NextResponse.json({
        success: false,
        calcom_cancelled: false,
        message: 'Job is already cancelled'
      }, { status: 400 });
    }

    if (job.status === 'en_route' || job.status === 'on_site') {
      return NextResponse.json({
        success: false,
        calcom_cancelled: false,
        message: 'Cannot cancel a job that is already in progress'
      }, { status: 400 });
    }

    // Try to cancel in Cal.com if booking UID exists
    let calcomCancelled = false;
    if (job.cal_com_booking_uid) {
      const calResult = await cancelCalComBooking(
        job.cal_com_booking_uid,
        body.reason
      );
      calcomCancelled = calResult.success;

      // If Cal.com sync fails, still allow local cancellation but warn
      if (!calResult.success) {
        console.warn('Cal.com cancellation failed, proceeding with local cancellation:', calResult.message);
      }
    }

    // Update job in database
    const { data: updatedJob, error: updateError } = await adminClient
      .from('jobs')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Job update error:', updateError);
      return NextResponse.json({
        success: false,
        calcom_cancelled: calcomCancelled,
        message: 'Failed to update job'
      }, { status: 500 });
    }

    // Build success message
    let message = 'Job cancelled successfully.';
    if (job.cal_com_booking_uid) {
      if (calcomCancelled) {
        message += ' Customer calendar appointment has been removed.';
      } else {
        message += ' Note: Calendar appointment may still exist - please verify manually.';
      }
    }

    return NextResponse.json({
      success: true,
      job: updatedJob,
      calcom_cancelled: calcomCancelled,
      message,
    });
  } catch (error) {
    console.error('Cancel error:', error);
    return NextResponse.json({
      success: false,
      calcom_cancelled: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}
