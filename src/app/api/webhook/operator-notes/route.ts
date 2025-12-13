import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Webhook to sync operator notes from backend
 * Called when:
 * 1. Operator creates a note via SMS reply (code 3)
 * 2. Backend syncs customer status with notes
 */

interface IncomingNote {
  customer_phone: string;
  customer_name?: string;
  note_text: string;
  created_by?: string;        // Operator email/name
  expires_at?: string;        // ISO datetime
  is_active?: boolean;
  backend_note_id?: string;   // ID from backend for dedup
  user_email: string;         // To find the user
  // Optional links
  job_id?: string;
  lead_id?: string;
}

export async function POST(request: NextRequest) {
  // Validate webhook secret
  const webhookSecret = request.headers.get('X-Webhook-Secret');
  if (webhookSecret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body: IncomingNote = await request.json();

    // Validate required fields
    if (!body.customer_phone || !body.note_text || !body.user_email) {
      return NextResponse.json(
        { error: 'Missing required fields: customer_phone, note_text, user_email' },
        { status: 400 }
      );
    }

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
