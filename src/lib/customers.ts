import { SupabaseClient } from '@supabase/supabase-js';

interface CustomerData {
  name: string;
  phone: string;
  address?: string;
}

/**
 * Find an existing customer by phone number or create a new one.
 * Phone number is the unique identifier per user.
 *
 * @param supabase - Supabase client (admin or authenticated)
 * @param userId - The user ID who owns the customer
 * @param customerData - Customer name, phone, and optional address
 * @returns customer_id if found/created, null if no phone provided
 */
export async function findOrCreateCustomer(
  supabase: SupabaseClient,
  userId: string,
  customerData: CustomerData
): Promise<string | null> {
  // Skip if no phone number
  if (!customerData.phone || customerData.phone.trim() === '') {
    return null;
  }

  const normalizedPhone = customerData.phone.trim();

  // Try to find existing customer by phone
  const { data: existingCustomer, error: findError } = await supabase
    .from('customers')
    .select('id')
    .eq('user_id', userId)
    .eq('phone', normalizedPhone)
    .single();

  if (existingCustomer && !findError) {
    // Customer exists, return their ID
    return existingCustomer.id;
  }

  // Customer doesn't exist, create new one
  const { data: newCustomer, error: createError } = await supabase
    .from('customers')
    .insert({
      user_id: userId,
      name: customerData.name,
      phone: normalizedPhone,
      address: customerData.address || null,
    })
    .select('id')
    .single();

  if (createError) {
    // Handle race condition - customer may have been created between check and insert
    if (createError.code === '23505') {
      // Unique violation - try to fetch the existing customer
      const { data: raceCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', userId)
        .eq('phone', normalizedPhone)
        .single();

      if (raceCustomer) {
        return raceCustomer.id;
      }
    }

    console.error('Error creating customer:', createError);
    return null;
  }

  return newCustomer?.id || null;
}
