import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/calls?phone=xxx&customer_id=xxx&outcome=xxx
 * Returns call history with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
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

    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    const customerId = searchParams.get('customer_id');
    const outcome = searchParams.get('outcome');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let query = supabase
      .from('calls')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by phone number
    if (phone) {
      // Normalize phone for matching
      const normalizedPhone = phone.replace(/\D/g, '');
      query = query.or(`phone_number.ilike.%${normalizedPhone}%,phone_number.ilike.%${phone}%`);
    }

    // Filter by outcome
    if (outcome) {
      query = query.eq('outcome', outcome);
    }

    // Filter by customer (look up phone from customer record)
    if (customerId) {
      const { data: customer } = await supabase
        .from('customers')
        .select('phone')
        .eq('id', customerId)
        .single();

      if (customer?.phone) {
        const normalizedPhone = customer.phone.replace(/\D/g, '');
        query = query.or(`phone_number.ilike.%${normalizedPhone}%,phone_number.ilike.%${customer.phone}%`);
      } else {
        // No customer found, return empty
        return NextResponse.json({ calls: [], total: 0 });
      }
    }

    const { data: calls, error, count } = await query;

    if (error) {
      console.error('Error fetching calls:', error);
      return NextResponse.json({ error: 'Failed to fetch calls' }, { status: 500 });
    }

    return NextResponse.json({
      calls: calls || [],
      total: count || 0,
      limit,
      offset,
      timezone: profile?.timezone || 'America/New_York',
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
