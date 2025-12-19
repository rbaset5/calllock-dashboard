import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkTables() {
  // Check if calls table exists
  const { data: calls, error: callsError } = await supabase
    .from('calls')
    .select('id')
    .limit(1);
  
  if (callsError) {
    console.log('❌ calls table ERROR:', callsError.message);
  } else {
    console.log('✅ calls table exists, rows:', calls?.length);
  }

  // Check if users table exists
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', 'rashid.baset@gmail.com')
    .single();
  
  if (usersError) {
    console.log('❌ users table ERROR:', usersError.message);
  } else {
    console.log('✅ users table exists, found user:', users?.email, users?.id);
  }

  // Check leads table  
  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('id')
    .limit(1);
  
  if (leadsError) {
    console.log('❌ leads table ERROR:', leadsError.message);
  } else {
    console.log('✅ leads table exists, rows:', leads?.length);
  }

  // Check jobs table
  const { data: jobs, error: jobsError } = await supabase
    .from('jobs')
    .select('id')
    .limit(1);
  
  if (jobsError) {
    console.log('❌ jobs table ERROR:', jobsError.message);
  } else {
    console.log('✅ jobs table exists, rows:', jobs?.length);
  }
}

checkTables();
