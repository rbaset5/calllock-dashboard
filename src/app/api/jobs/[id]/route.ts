import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

const SUPABASE_URL = 'https://xboybmqtwsxmdokgzclk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhib3libXF0d3N4bWRva2d6Y2xrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2ODc3NDUsImV4cCI6MjA4MDI2Mzc0NX0.wGxgfhegig_QPnKu8cGMpYgiP7LdTMeRl4RF93SPeM0';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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

  // Get job (only if it belongs to the user)
  const { data: job, error } = await adminClient
    .from('jobs')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  // Get user timezone
  const { data: profile } = await adminClient
    .from('users')
    .select('timezone')
    .eq('id', user.id)
    .single();

  return NextResponse.json({
    job,
    timezone: profile?.timezone || 'America/New_York',
  });
}

interface UpdateJobBody {
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  service_type?: 'hvac' | 'plumbing' | 'electrical' | 'general';
  urgency?: 'low' | 'medium' | 'high' | 'emergency';
  ai_summary?: string;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Get user from session cookies
  const cookieStore = await cookies();
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {},
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

  // First, check if job exists and belongs to user
  const { data: existingJob, error: fetchError } = await adminClient
    .from('jobs')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !existingJob) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  // Only allow editing jobs with status 'new'
  if (existingJob.status !== 'new') {
    return NextResponse.json(
      { error: 'Can only edit jobs with status "new"' },
      { status: 400 }
    );
  }

  const body: UpdateJobBody = await request.json();

  // Build update object
  const updateData: Record<string, unknown> = {};

  if (body.customer_name !== undefined) updateData.customer_name = body.customer_name;
  if (body.customer_phone !== undefined) updateData.customer_phone = body.customer_phone;
  if (body.customer_address !== undefined) updateData.customer_address = body.customer_address;
  if (body.service_type !== undefined) updateData.service_type = body.service_type;
  if (body.urgency !== undefined) updateData.urgency = body.urgency;
  if (body.ai_summary !== undefined) updateData.ai_summary = body.ai_summary;

  const { data: job, error } = await adminClient
    .from('jobs')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error || !job) {
    console.error('Error updating job:', error);
    return NextResponse.json({ error: 'Failed to update job' }, { status: 500 });
  }

  return NextResponse.json({ job });
}
