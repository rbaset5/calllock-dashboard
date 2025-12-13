import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/operator-notes?phone=xxx or ?job_id=xxx or ?lead_id=xxx
 * Returns operator notes for a customer/job/lead
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    const jobId = searchParams.get('job_id');
    const leadId = searchParams.get('lead_id');

    if (!phone && !jobId && !leadId) {
      return NextResponse.json(
        { error: 'Must provide phone, job_id, or lead_id' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('operator_notes')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    // Filter by phone, job_id, or lead_id
    if (phone) {
      query = query.eq('customer_phone', phone);
    } else if (jobId) {
      query = query.eq('job_id', jobId);
    } else if (leadId) {
      query = query.eq('lead_id', leadId);
    }

    const { data: notes, error } = await query;

    if (error) {
      console.error('Error fetching notes:', error);
      return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
    }

    // Filter out expired notes
    const now = new Date();
    const activeNotes = notes?.filter(note => {
      if (!note.expires_at) return true;
      return new Date(note.expires_at) > now;
    }) || [];

    return NextResponse.json({ notes: activeNotes });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/operator-notes
 * Create a new operator note
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    if (!body.customer_phone || !body.note_text) {
      return NextResponse.json(
        { error: 'Missing required fields: customer_phone, note_text' },
        { status: 400 }
      );
    }

    // Try to find customer by phone
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('user_id', user.id)
      .eq('phone', body.customer_phone)
      .single();

    const { data: note, error } = await supabase
      .from('operator_notes')
      .insert({
        user_id: user.id,
        customer_phone: body.customer_phone,
        customer_name: body.customer_name || null,
        note_text: body.note_text,
        created_by: user.email,
        expires_at: body.expires_at || null,
        is_active: true,
        job_id: body.job_id || null,
        lead_id: body.lead_id || null,
        customer_id: customer?.id || null,
        synced_from_backend: false,
      })
      .select()
      .single();

    if (error || !note) {
      console.error('Error creating note:', error);
      return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
    }

    return NextResponse.json({ success: true, note });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/operator-notes?id=xxx
 * Deactivate a note (soft delete)
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get('id');

    if (!noteId) {
      return NextResponse.json({ error: 'Missing note id' }, { status: 400 });
    }

    const { error } = await supabase
      .from('operator_notes')
      .update({ is_active: false })
      .eq('id', noteId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting note:', error);
      return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
