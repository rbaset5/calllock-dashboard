import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export interface CustomerNote {
  id: string;
  phone_number: string;
  note: string;
  created_by?: string;
  created_at: string;
  expires_at?: string;
  is_active: boolean;
}

/**
 * GET /api/customer-notes?phone=xxx
 * Get all notes for a phone number
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    if (!phone) {
      return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
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

    // Normalize phone number
    const normalizedPhone = phone.replace(/\D/g, '');

    const adminClient = createAdminClient();
    const { data: notes, error } = await adminClient
      .from('customer_notes')
      .select('*')
      .eq('phone_number', normalizedPhone)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching customer notes:', error);
      return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
    }

    return NextResponse.json({ notes: notes || [] });
  } catch (error) {
    console.error('Customer notes API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/customer-notes
 * Create a new customer note
 */
export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json();
    const { phone_number, note, expires_at } = body;

    if (!phone_number || !note) {
      return NextResponse.json({ error: 'Phone number and note are required' }, { status: 400 });
    }

    // Normalize phone number
    const normalizedPhone = phone_number.replace(/\D/g, '');

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('customer_notes')
      .insert({
        phone_number: normalizedPhone,
        note,
        created_by: user.email,
        expires_at: expires_at || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating customer note:', error);
      return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
    }

    return NextResponse.json({ note: data });
  } catch (error) {
    console.error('Customer notes API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
