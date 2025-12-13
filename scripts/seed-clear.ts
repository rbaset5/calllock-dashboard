import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { SEED_PHONE_PREFIX } from './seed-data';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const seedUserEmail = process.env.SEED_USER_EMAIL;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Check .env.local');
  process.exit(1);
}

if (!seedUserEmail) {
  console.error('Missing SEED_USER_EMAIL environment variable.');
  console.error('Usage: SEED_USER_EMAIL=your@email.com npm run seed:clear');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function clearSeed() {
  console.log(`\n🧹 Clearing seed data for user: ${seedUserEmail}\n`);

  // 1. Look up user
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', seedUserEmail)
    .single();

  if (userError || !user) {
    console.error(`User not found: ${seedUserEmail}`);
    process.exit(1);
  }

  console.log(`Found user: ${user.email} (${user.id})`);
  const userId = user.id;

  // Delete in reverse order of dependencies
  let totalDeleted = 0;

  // 1. AI booking reviews
  console.log('\n🤖 Clearing AI booking reviews...');
  const { data: deletedReviews, error: reviewsError } = await supabase
    .from('ai_booking_reviews')
    .delete()
    .eq('user_id', userId)
    .select();

  if (reviewsError) {
    console.error('  Error:', reviewsError.message);
  } else {
    const count = deletedReviews?.length || 0;
    totalDeleted += count;
    console.log(`  ✅ Deleted ${count} AI booking reviews`);
  }

  // 2. Leads (phone starts with seed prefix)
  console.log('\n📞 Clearing leads...');
  const { data: deletedLeads, error: leadsError } = await supabase
    .from('leads')
    .delete()
    .eq('user_id', userId)
    .like('customer_phone', `${SEED_PHONE_PREFIX}%`)
    .select();

  if (leadsError) {
    console.error('  Error:', leadsError.message);
  } else {
    const count = deletedLeads?.length || 0;
    totalDeleted += count;
    console.log(`  ✅ Deleted ${count} leads`);
  }

  // 3. Jobs (phone starts with seed prefix)
  console.log('\n📋 Clearing jobs...');
  const { data: deletedJobs, error: jobsError } = await supabase
    .from('jobs')
    .delete()
    .eq('user_id', userId)
    .like('customer_phone', `${SEED_PHONE_PREFIX}%`)
    .select();

  if (jobsError) {
    console.error('  Error:', jobsError.message);
  } else {
    const count = deletedJobs?.length || 0;
    totalDeleted += count;
    console.log(`  ✅ Deleted ${count} jobs`);
  }

  // 4. Customers (phone starts with seed prefix)
  console.log('\n👥 Clearing customers...');
  const { data: deletedCustomers, error: customersError } = await supabase
    .from('customers')
    .delete()
    .eq('user_id', userId)
    .like('phone', `${SEED_PHONE_PREFIX}%`)
    .select();

  if (customersError) {
    console.error('  Error:', customersError.message);
  } else {
    const count = deletedCustomers?.length || 0;
    totalDeleted += count;
    console.log(`  ✅ Deleted ${count} customers`);
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('🧹 Seed data cleared!');
  console.log('='.repeat(50));
  console.log(`
📊 Total records deleted: ${totalDeleted}

💡 To re-seed data, run: npm run seed
`);
}

// Run
clearSeed().catch(console.error);
