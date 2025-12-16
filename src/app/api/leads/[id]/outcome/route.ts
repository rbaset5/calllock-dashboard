import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { CallbackOutcome } from '@/types/database';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface OutcomeRequest {
  outcome: CallbackOutcome;
  note?: string;
  snooze_until?: string; // ISO date string for "try_again" with snooze
}

/**
 * POST /api/leads/[id]/outcome
 *
 * Records the outcome of a callback attempt.
 *
 * Outcomes:
 * - booked: Lead converted to job (triggers booking flow)
 * - resolved: Issue resolved without booking (customer satisfied)
 * - try_again: Need to try again later (can include snooze time)
 * - no_answer: Customer didn't answer
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;
    const body: OutcomeRequest = await request.json();

    // Validate outcome
    const validOutcomes: CallbackOutcome[] = ['booked', 'resolved', 'try_again', 'no_answer'];
    if (!validOutcomes.includes(body.outcome)) {
      return NextResponse.json(
        { error: `Invalid outcome. Must be one of: ${validOutcomes.join(', ')}` },
        { status: 400 }
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

    const adminClient = createAdminClient();

    // Verify lead belongs to user
    const { data: lead, error: leadError } = await adminClient
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (lead.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const now = new Date().toISOString();

    // Build update based on outcome
    const updateData: Record<string, unknown> = {
      callback_outcome: body.outcome,
      callback_outcome_at: now,
      callback_outcome_note: body.note || null,
      last_call_tapped_at: null, // Clear the tap to prevent repeat prompts
      updated_at: now,
    };

    // Handle specific outcome logic
    switch (body.outcome) {
      case 'booked':
        // Mark as converted (the actual job creation happens separately via booking flow)
        updateData.status = 'converted';
        updateData.converted_at = now;
        break;

      case 'resolved':
        // Customer issue resolved without needing a job
        updateData.status = 'converted'; // Still "converted" as it's a successful resolution
        updateData.converted_at = now;
        break;

      case 'try_again':
        // Set snooze/remind time if provided
        if (body.snooze_until) {
          updateData.remind_at = body.snooze_until;
        } else {
          // Default snooze: 1 hour from now
          const oneHourLater = new Date(Date.now() + 60 * 60 * 1000);
          updateData.remind_at = oneHourLater.toISOString();
        }
        updateData.status = 'callback_requested'; // Keep in queue
        break;

      case 'no_answer':
        // Mark voicemail status and set short snooze
        updateData.status = 'voicemail_left';
        // Default snooze: 30 minutes for no answer
        const thirtyMinLater = new Date(Date.now() + 30 * 60 * 1000);
        updateData.remind_at = thirtyMinLater.toISOString();
        break;
    }

    // Update the lead
    const { data: updatedLead, error: updateError } = await adminClient
      .from('leads')
      .update(updateData)
      .eq('id', leadId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating lead outcome:', updateError);
      return NextResponse.json(
        { error: 'Failed to update outcome' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Outcome recorded: ${body.outcome}`,
      lead: updatedLead,
      next_action: body.outcome === 'booked'
        ? 'Proceed to booking flow'
        : body.outcome === 'try_again'
          ? `Reminder set for ${updateData.remind_at}`
          : 'Lead updated',
    });
  } catch (error) {
    console.error('Outcome API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
