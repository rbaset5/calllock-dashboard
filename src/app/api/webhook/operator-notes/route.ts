import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateWebhookAuth } from '@/lib/middleware/webhook-auth';
import { operatorNotesWebhookSchema } from '@/lib/schemas/webhook-schemas';

/**
 * Webhook to sync operator notes from backend
 * Called when:
 * 1. Operator creates a note via SMS reply (code 3)
 * 2. Backend syncs customer status with notes
 */

export async function POST(request: NextRequest) {
  // Validate webhook secret using middleware
  const authError = validateWebhookAuth(request);
  if (authError) return authError;

  try {
    const rawBody = await request.json();

    // Validate payload with Zod schema
    const parseResult = operatorNotesWebhookSchema.safeParse(rawBody);
    if (!parseResult.success) {
      console.error('Validation failed:', parseResult.error.issues);
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: parseResult.error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }

    const body = parseResult.data;
    const supabase = createAdminClient();

    // Find user by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', body.user_email)
      .single();

    if (userError || !user) {
      console.error('User not found:', body.user_email);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check for existing note with same backend_note_id (dedup)
    if (body.backend_note_id) {
      const { data: existing } = await supabase
        .from('operator_notes')
        .select('id')
        .eq('user_id', user.id)
        .eq('backend_note_id', body.backend_note_id)
        .single();

      if (existing) {
        // Update existing note
        const { data: updated, error: updateError } = await supabase
          .from('operator_notes')
          .update({
            note_text: body.note_text,
            is_active: body.is_active ?? true,
            expires_at: body.expires_at || null,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating note:', updateError);
          return NextResponse.json(
            { error: 'Failed to update note' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          note_id: updated.id,
          action: 'updated',
        });
      }
    }

    // Try to find customer by phone
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('user_id', user.id)
      .eq('phone', body.customer_phone)
      .single();

    // Create new note
    const { data: note, error: noteError } = await supabase
      .from('operator_notes')
      .insert({
        user_id: user.id,
        customer_phone: body.customer_phone,
        customer_name: body.customer_name || null,
        note_text: body.note_text,
        created_by: body.created_by || null,
        expires_at: body.expires_at || null,
        is_active: body.is_active ?? true,
        job_id: body.job_id || null,
        lead_id: body.lead_id || null,
        customer_id: customer?.id || null,
        synced_from_backend: true,
        backend_note_id: body.backend_note_id || null,
      })
      .select()
      .single();

    if (noteError || !note) {
      console.error('Error creating note:', noteError);
      return NextResponse.json(
        { error: 'Failed to create note' },
        { status: 500 }
      );
    }

    console.log(`Operator note created: ${note.id} for ${body.customer_phone}`);

    return NextResponse.json({
      success: true,
      note_id: note.id,
      action: 'created',
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
