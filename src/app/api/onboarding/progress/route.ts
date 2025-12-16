import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * GET /api/onboarding/progress
 *
 * Fetch current onboarding progress for the authenticated user
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

    // Get user data with onboarding fields
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select(`
        id,
        phone,
        business_phone,
        carrier,
        cal_com_connected,
        call_forwarding_verified,
        onboarding_step,
        onboarding_completed_at
      `)
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('Error fetching user:', userError);
      return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 });
    }

    // Get business hours if they exist
    const { data: businessHours } = await adminClient
      .from('business_hours')
      .select('*')
      .eq('user_id', user.id)
      .order('day_of_week');

    const response = {
      completed: !!userData?.onboarding_completed_at,
      currentStep: userData?.onboarding_step || 1,
      data: {
        cellPhone: userData?.phone || '',
        businessPhone: userData?.business_phone || '',
        carrier: userData?.carrier || 'other',
        calComConnected: userData?.cal_com_connected || false,
        forwardingSetup: userData?.call_forwarding_verified || false,
        businessHours: businessHours?.map((bh) => ({
          dayOfWeek: bh.day_of_week,
          dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
            bh.day_of_week
          ],
          isOpen: bh.is_open,
          openTime: bh.open_time,
          closeTime: bh.close_time,
        })) || [],
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Onboarding progress error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/onboarding/progress
 *
 * Save onboarding progress
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
    const adminClient = createAdminClient();

    // Update user fields
    const userUpdate: Record<string, unknown> = {
      onboarding_step: body.currentStep,
      updated_at: new Date().toISOString(),
    };

    if (body.cellPhone) {
      userUpdate.phone = body.cellPhone;
    }
    if (body.businessPhone) {
      userUpdate.business_phone = body.businessPhone;
    }
    if (body.carrier) {
      userUpdate.carrier = body.carrier;
    }
    if (body.calComConnected !== undefined) {
      userUpdate.cal_com_connected = body.calComConnected;
    }
    if (body.forwardingSetup !== undefined) {
      userUpdate.call_forwarding_verified = body.forwardingSetup;
    }

    const { error: updateError } = await adminClient
      .from('users')
      .update(userUpdate)
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating user:', updateError);
      return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
    }

    // Save business hours if provided
    if (body.businessHours && Array.isArray(body.businessHours)) {
      // Delete existing hours first
      await adminClient
        .from('business_hours')
        .delete()
        .eq('user_id', user.id);

      // Insert new hours
      const hoursToInsert = body.businessHours.map((bh: {
        dayOfWeek: number;
        isOpen: boolean;
        openTime: string;
        closeTime: string;
      }) => ({
        user_id: user.id,
        day_of_week: bh.dayOfWeek,
        is_open: bh.isOpen,
        open_time: bh.openTime,
        close_time: bh.closeTime,
      }));

      const { error: hoursError } = await adminClient
        .from('business_hours')
        .insert(hoursToInsert);

      if (hoursError) {
        console.error('Error saving business hours:', hoursError);
        // Don't fail the whole request, just log it
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Onboarding progress save error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
