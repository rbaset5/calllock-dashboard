import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export interface ServiceArea {
  id: string;
  zip_code: string;
  city?: string;
  state?: string;
  created_at: string;
}

/**
 * GET /api/settings/service-areas
 *
 * Fetch user's service areas (zip codes)
 */
export async function GET() {
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    const { data: areas, error } = await adminClient
      .from('service_areas')
      .select('*')
      .eq('user_id', user.id)
      .order('zip_code', { ascending: true });

    if (error) {
      console.error('Error fetching service areas:', error);
      return NextResponse.json({ error: 'Failed to fetch service areas' }, { status: 500 });
    }

    return NextResponse.json({ areas: areas || [] });
  } catch (error) {
    console.error('Service areas API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/settings/service-areas
 *
 * Add a new service area
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { zip_code, city, state } = body;

    if (!zip_code || !/^\d{5}$/.test(zip_code)) {
      return NextResponse.json({ error: 'Invalid zip code (must be 5 digits)' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Check if already exists
    const { data: existing } = await adminClient
      .from('service_areas')
      .select('id')
      .eq('user_id', user.id)
      .eq('zip_code', zip_code)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Zip code already in service area' }, { status: 409 });
    }

    const { data: area, error } = await adminClient
      .from('service_areas')
      .insert({
        user_id: user.id,
        zip_code,
        city: city || null,
        state: state || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding service area:', error);
      return NextResponse.json({ error: 'Failed to add service area' }, { status: 500 });
    }

    return NextResponse.json({ area });
  } catch (error) {
    console.error('Service areas API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/settings/service-areas
 *
 * Remove a service area
 */
export async function DELETE(request: NextRequest) {
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Service area ID required' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from('service_areas')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting service area:', error);
      return NextResponse.json({ error: 'Failed to delete service area' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Service areas API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
