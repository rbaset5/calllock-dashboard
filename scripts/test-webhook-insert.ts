import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function testInsert() {
  // Get user
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'rashid.baset@gmail.com')
    .single();

  if (userError) {
    console.log('User error:', userError);
    return;
  }
  console.log('Found user:', user.id);

  // Try inserting a call
  const callId = 'test-' + Math.random().toString(36).substring(7);
  const { data: call, error: callError } = await supabase
    .from('calls')
    .insert({
      user_id: user.id,
      call_id: callId,
      phone_number: '+15125551234',
      customer_name: 'Test Direct Insert',
      started_at: new Date().toISOString(),
      duration_seconds: 60,
      direction: 'inbound',
      outcome: 'completed',
      synced_from_backend: true,
      backend_call_id: callId,
    })
    .select()
    .single();

  if (callError) {
    console.log('❌ Call insert ERROR:', callError);
  } else {
    console.log('✅ Call inserted successfully:', call.id);
    // Clean up
    await supabase.from('calls').delete().eq('id', call.id);
    console.log('✅ Cleaned up test call');
  }
}

testInsert();
