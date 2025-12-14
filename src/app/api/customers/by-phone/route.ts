import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { Customer, Job, Lead, SmsLog, Call } from '@/types/database';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export interface CustomerByPhoneResponse {
  found: boolean;
  customer?: Customer;
  serviceHistory?: Job[];
  leads?: Lead[];
  recentSms?: SmsLog[];
  calls?: Call[];
  timezone?: string;
}

/**
 * GET /api/customers/by-phone?phone=xxx
 * Lookup customer by phone number with related data
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

    // Get user profile for timezone
    const { data: profile } = await supabase
      .from('users')
      .select('timezone')
      .eq('id', user.id)
      .single();

    const adminClient = createAdminClient();

    // Normalize phone for matching (strip non-digits)
    const normalizedPhone = phone.replace(/\D/g, '');

    // Try to find customer by phone
    const { data: customer } = await adminClient
      .from('customers')
      .select('*')
      .eq('user_id', user.id)
      .or(`phone.ilike.%${normalizedPhone}%,phone.ilike.%${phone}%`)
      .limit(1)
      .single();

    if (!customer) {
      // No customer found
      return NextResponse.json({
        found: false,
        timezone: profile?.timezone || 'America/New_York',
      });
    }

    // Get service history (completed jobs)
    const { data: serviceHistory } = await adminClient
      .from('jobs')
      .select('*')
      .eq('user_id', user.id)
      .or(`customer_id.eq.${customer.id},customer_phone.ilike.%${normalizedPhone}%`)
      .order('scheduled_at', { ascending: false })
      .limit(10);

    // Get leads (non-booked interactions)
    const { data: leads } = await adminClient
      .from('leads')
      .select('*')
      .eq('user_id', user.id)
      .or(`customer_phone.ilike.%${normalizedPhone}%,customer_phone.ilike.%${phone}%`)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get recent SMS
    const { data: recentSms } = await adminClient
      .from('sms_log')
      .select('*')
      .eq('user_id', user.id)
      .or(`to_phone.ilike.%${normalizedPhone}%,from_phone.ilike.%${normalizedPhone}%`)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get call history
    const { data: calls } = await adminClient
      .from('calls')
      .select('*')
      .eq('user_id', user.id)
      .or(`phone_number.ilike.%${normalizedPhone}%,phone_number.ilike.%${phone}%`)
      .order('started_at', { ascending: false })
      .limit(10);

    const response: CustomerByPhoneResponse = {
      found: true,
      customer,
      serviceHistory: serviceHistory || [],
      leads: leads || [],
      recentSms: recentSms || [],
      calls: calls || [],
      timezone: profile?.timezone || 'America/New_York',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Customer by-phone lookup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
