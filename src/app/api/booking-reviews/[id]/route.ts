import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { BookingReviewStatus } from '@/types/database';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface UpdateBookingReviewBody {
  status: BookingReviewStatus;
  adjusted_scheduled_at?: string;
  adjustment_reason?: string;
  cancellation_reason?: string;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: UpdateBookingReviewBody = await request.json();

    if (!body.status) {
      return NextResponse.json({ error: 'status is required' }, { status: 400 });
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

    // Get the booking review
    const { data: review, error: reviewError } = await adminClient
      .from('ai_booking_reviews')
      .select('*, jobs(*)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (reviewError || !review) {
      return NextResponse.json({ error: 'Booking review not found' }, { status: 404 });
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      status: body.status,
      reviewed_at: new Date().toISOString(),
    };

    if (body.status === 'adjusted' && body.adjusted_scheduled_at) {
      updateData.adjusted_scheduled_at = body.adjusted_scheduled_at;
      updateData.adjustment_reason = body.adjustment_reason || null;
    }

    if (body.status === 'cancelled') {
      updateData.cancellation_reason = body.cancellation_reason || null;
    }

    // Update the booking review
    const { data: updatedReview, error: updateError } = await adminClient
      .from('ai_booking_reviews')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError || !updatedReview) {
      console.error('Error updating booking review:', updateError);
      return NextResponse.json({ error: 'Failed to update booking review' }, { status: 500 });
    }

    // Also update the job based on the review status
    const jobUpdates: Record<string, unknown> = {
      booking_confirmed: body.status === 'confirmed' || body.status === 'adjusted',
    };

    if (body.status === 'adjusted' && body.adjusted_scheduled_at) {
      jobUpdates.scheduled_at = body.adjusted_scheduled_at;
    }

    if (body.status === 'cancelled') {
      jobUpdates.status = 'cancelled';
      jobUpdates.cancelled_at = new Date().toISOString();
    }

    await adminClient
      .from('jobs')
      .update(jobUpdates)
      .eq('id', review.job_id)
      .eq('user_id', user.id);

    return NextResponse.json(updatedReview);
  } catch (error) {
    console.error('Update booking review error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
