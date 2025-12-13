import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { Customer, Job, CustomerEquipment } from '@/types/database';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export interface CustomerDetailResponse {
  customer: Customer;
  serviceHistory: Job[];
}

interface UpdateCustomerBody {
  name?: string;
  phone?: string;
  email?: string | null;
  address?: string | null;
  equipment?: CustomerEquipment[];
  notes?: string | null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    // Get customer
    const { data: customer, error: customerError } = await adminClient
      .from('customers')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Get service history (jobs linked to this customer)
    const { data: serviceHistory } = await adminClient
      .from('jobs')
      .select('*')
      .eq('user_id', user.id)
      .eq('customer_id', id)
      .order('scheduled_at', { ascending: false })
      .limit(20);

    // If no jobs linked by customer_id, try matching by phone
    let history = serviceHistory || [];
    if (history.length === 0) {
      const { data: jobsByPhone } = await adminClient
        .from('jobs')
        .select('*')
        .eq('user_id', user.id)
        .eq('customer_phone', customer.phone)
        .order('scheduled_at', { ascending: false })
        .limit(20);

      history = jobsByPhone || [];
    }

    const response: CustomerDetailResponse = {
      customer,
      serviceHistory: history,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Get customer error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: UpdateCustomerBody = await request.json();

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

    // Build update object
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.address !== undefined) updateData.address = body.address;
    if (body.equipment !== undefined) updateData.equipment = body.equipment;
    if (body.notes !== undefined) updateData.notes = body.notes;

    const { data: customer, error } = await adminClient
      .from('customers')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !customer) {
      console.error('Error updating customer:', error);
      return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
    }

    return NextResponse.json(customer);
  } catch (error) {
    console.error('Update customer error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
