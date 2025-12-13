import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { seedCustomers, seedJobs, seedLeads, createAIBookingReviews, SEED_PHONE_PREFIX } from './seed-data';

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
  console.error('Usage: SEED_USER_EMAIL=your@email.com npm run seed');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function seed() {
  console.log(`\n🌱 Seeding data for user: ${seedUserEmail}\n`);

  // 1. Look up user
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, email, timezone')
    .eq('email', seedUserEmail)
    .single();

  if (userError || !user) {
    console.error(`User not found: ${seedUserEmail}`);
    console.error('Make sure the user exists in the database (sign up first).');
    process.exit(1);
  }

  console.log(`Found user: ${user.email} (${user.id})`);
  const userId = user.id;

  // 2. Clear existing seed data first
  console.log('\n🧹 Clearing existing seed data...');
  await clearSeedData(userId);

  // 3. Insert customers
  console.log('\n👥 Creating customers...');
  const customersToInsert = seedCustomers.map(c => ({
    ...c,
    user_id: userId,
  }));

  const { data: insertedCustomers, error: customersError } = await supabase
    .from('customers')
    .insert(customersToInsert)
    .select();

  if (customersError) {
    console.error('Error inserting customers:', customersError);
    process.exit(1);
  }
  console.log(`  ✅ Created ${insertedCustomers?.length || 0} customers`);

  // 4. Insert jobs
  console.log('\n📋 Creating jobs...');
  const jobsToInsert = seedJobs.map(j => {
    // Find matching customer
    const customer = insertedCustomers?.find(c => c.phone === j.customer_phone);
    return {
      user_id: userId,
      customer_id: customer?.id || null,
      customer_name: j.customer_name,
      customer_phone: j.customer_phone,
      customer_address: j.customer_address,
      service_type: j.service_type,
      urgency: j.urgency,
      status: j.status,
      scheduled_at: j.scheduled_at.toISOString(),
      completed_at: j.completed_at ? j.completed_at.toISOString() : null,
      estimated_value: j.estimated_value,
      revenue: j.revenue || null,
      ai_summary: j.ai_summary,
      started_at: j.started_at ? j.started_at.toISOString() : null,
      travel_started_at: j.travel_started_at ? j.travel_started_at.toISOString() : null,
      is_ai_booked: j.is_ai_booked || false,
      booking_confirmed: j.booking_confirmed || false,
    };
  });

  const { data: insertedJobs, error: jobsError } = await supabase
    .from('jobs')
    .insert(jobsToInsert)
    .select();

  if (jobsError) {
    console.error('Error inserting jobs:', jobsError);
    process.exit(1);
  }
  console.log(`  ✅ Created ${insertedJobs?.length || 0} jobs`);

  // 5. Insert leads
  console.log('\n📞 Creating leads...');
  const leadsToInsert = seedLeads.map(l => ({
    user_id: userId,
    customer_name: l.customer_name,
    customer_phone: l.customer_phone,
    customer_address: l.customer_address,
    status: l.status,
    priority: l.priority,
    why_not_booked: l.why_not_booked,
    issue_description: l.issue_description,
    service_type: l.service_type,
    urgency: l.urgency,
    estimated_value: l.estimated_value,
    callback_requested_at: l.callback_requested_at ? l.callback_requested_at.toISOString() : null,
    remind_at: l.remind_at ? l.remind_at.toISOString() : null,
    ai_summary: l.ai_summary,
  }));

  const { data: insertedLeads, error: leadsError } = await supabase
    .from('leads')
    .insert(leadsToInsert)
    .select();

  if (leadsError) {
    console.error('Error inserting leads:', leadsError);
    process.exit(1);
  }
  console.log(`  ✅ Created ${insertedLeads?.length || 0} leads`);

  // 6. Create AI booking reviews for unconfirmed AI-booked jobs
  console.log('\n🤖 Creating AI booking reviews...');
  const jobsNeedingReview = (insertedJobs || [])
    .filter(j => j.is_ai_booked && !j.booking_confirmed)
    .map(j => ({
      user_id: userId,
      job_id: j.id,
      status: 'pending' as const,
      original_scheduled_at: j.scheduled_at,
    }));

  if (jobsNeedingReview.length > 0) {
    const { data: insertedReviews, error: reviewsError } = await supabase
      .from('ai_booking_reviews')
      .insert(jobsNeedingReview)
      .select();

    if (reviewsError) {
      console.error('Error inserting AI booking reviews:', reviewsError);
    } else {
      console.log(`  ✅ Created ${insertedReviews?.length || 0} AI booking reviews`);
    }
  } else {
    console.log(`  ⏭️  No AI booking reviews needed`);
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('🎉 Seed complete!');
  console.log('='.repeat(50));
  console.log(`
📊 Summary:
   • Customers: ${insertedCustomers?.length || 0}
   • Jobs: ${insertedJobs?.length || 0}
   • Leads: ${insertedLeads?.length || 0}
   • AI Reviews: ${jobsNeedingReview.length}

🔗 View your dashboard at: http://localhost:8080

🧹 To clear seed data, run: npm run seed:clear
`);
}

async function clearSeedData(userId: string) {
  // Delete in reverse order of dependencies

  // AI booking reviews (has FK to jobs)
  const { error: reviewsError } = await supabase
    .from('ai_booking_reviews')
    .delete()
    .eq('user_id', userId);
  if (reviewsError) console.error('  Error clearing AI reviews:', reviewsError.message);

  // Leads (phone starts with seed prefix)
  const { error: leadsError } = await supabase
    .from('leads')
    .delete()
    .eq('user_id', userId)
    .like('customer_phone', `${SEED_PHONE_PREFIX}%`);
  if (leadsError) console.error('  Error clearing leads:', leadsError.message);

  // Jobs (phone starts with seed prefix)
  const { error: jobsError } = await supabase
    .from('jobs')
    .delete()
    .eq('user_id', userId)
    .like('customer_phone', `${SEED_PHONE_PREFIX}%`);
  if (jobsError) console.error('  Error clearing jobs:', jobsError.message);

  // Customers (phone starts with seed prefix)
  const { error: customersError } = await supabase
    .from('customers')
    .delete()
    .eq('user_id', userId)
    .like('phone', `${SEED_PHONE_PREFIX}%`);
  if (customersError) console.error('  Error clearing customers:', customersError.message);

  console.log('  ✅ Cleared existing seed data');
}

// Run
seed().catch(console.error);
