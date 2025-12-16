/**
 * Empty State Test Data Seeder (V4)
 *
 * Creates minimal historical data to test the "All caught up!" empty state:
 * - 0 active leads (ACTION page shows empty state)
 * - 4 historical leads (for HISTORY page badges)
 * - 4 completed jobs (for HISTORY page + stats)
 *
 * Uses V4 columns: priority_color, priority_reason, callback_outcome, etc.
 *
 * Usage: SEED_USER_EMAIL=your@email.com npm run seed:empty
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

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
  console.error('Usage: SEED_USER_EMAIL=your@email.com npm run seed:empty');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const SEED_PHONE_PREFIX = '+15551';

// Date helpers
const now = new Date();
const today = new Date(now);
today.setHours(0, 0, 0, 0);

const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);

function todayAt(hour: number, minute = 0): Date {
  const d = new Date(today);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function yesterdayAt(hour: number, minute = 0): Date {
  const d = new Date(yesterday);
  d.setHours(hour, minute, 0, 0);
  return d;
}

// Customers (8 total - for historical leads and jobs)
const CUSTOMERS = [
  { name: 'Resolved Lead', phone: `${SEED_PHONE_PREFIX}000024`, email: 'resolved@email.com', address: '111 Resolved Road, Austin, TX 78701', equipment: [], lifetime_value: 0, total_jobs: 0 },
  { name: 'James Brown', phone: `${SEED_PHONE_PREFIX}000013`, email: 'jbrown@email.com', address: '333 East Cesar Chavez, Austin, TX 78702', equipment: [], lifetime_value: 0, total_jobs: 0 },
  { name: 'Telemarketer', phone: `${SEED_PHONE_PREFIX}000014`, email: null, address: '', equipment: [], lifetime_value: 0, total_jobs: 0 },
  { name: 'Sarah Wilson', phone: `${SEED_PHONE_PREFIX}000012`, email: 'sarah.wilson@email.com', address: '222 West 5th Street, Austin, TX 78701', equipment: [{ type: 'Central AC', brand: 'Rheem', year: 2019 }], lifetime_value: 350, total_jobs: 1 },
  { name: 'Jennifer Adams', phone: `${SEED_PHONE_PREFIX}000021`, email: 'jadams@email.com', address: '700 Complete Circle, Austin, TX 78752', equipment: [{ type: 'Central AC', brand: 'Trane', year: 2021 }], lifetime_value: 800, total_jobs: 2 },
  { name: 'Amanda Foster', phone: `${SEED_PHONE_PREFIX}000022`, email: 'afoster@email.com', address: '800 Manual Way, Austin, TX 78753', equipment: [{ type: 'Heat Pump', brand: 'Rheem', year: 2022 }], lifetime_value: 300, total_jobs: 1 },
  { name: 'Early Bird Customer', phone: `${SEED_PHONE_PREFIX}000025`, email: 'earlybird@email.com', address: '100 Early Street, Austin, TX 78701', equipment: [{ type: 'Central AC', brand: 'Carrier', year: 2020 }], lifetime_value: 450, total_jobs: 1 },
  { name: 'Morning Customer', phone: `${SEED_PHONE_PREFIX}000026`, email: 'morning@email.com', address: '200 Morning Lane, Austin, TX 78702', equipment: [{ type: 'Heat Pump', brand: 'Lennox', year: 2019 }], lifetime_value: 275, total_jobs: 1 },
];

// Historical leads (4 total - for HISTORY page badges, all converted/lost)
// Uses V4 columns: priority_color, priority_reason, callback_outcome
const HISTORICAL_LEADS = [
  {
    customer_name: 'Resolved Lead',
    customer_phone: `${SEED_PHONE_PREFIX}000024`,
    customer_address: '111 Resolved Road, Austin, TX 78701',
    status: 'converted',
    priority: 'warm',
    // V4 columns
    priority_color: 'blue',
    priority_reason: 'Resolved over phone',
    why_not_booked: null,
    issue_description: 'AC filter question - resolved over phone',
    service_type: 'hvac',
    urgency: 'low',
    estimated_value: 0,
    ai_summary: 'Customer called about AC filter. Walked through process over phone. Issue resolved.',
    // V4 outcome tracking
    callback_outcome: 'resolved',
    callback_outcome_at: yesterdayAt(10).toISOString(),
    callback_outcome_note: 'Helped customer replace filter over phone',
    last_call_tapped_at: yesterdayAt(10).toISOString(),
  },
  {
    customer_name: 'James Brown',
    customer_phone: `${SEED_PHONE_PREFIX}000013`,
    customer_address: '333 East Cesar Chavez, Austin, TX 78702',
    status: 'lost',
    priority: 'cold',
    // V4 columns
    priority_color: 'blue',
    priority_reason: 'Lost - chose DIY',
    why_not_booked: 'Customer decided to DIY',
    issue_description: 'Thermostat battery replacement',
    service_type: 'hvac',
    urgency: 'low',
    estimated_value: 0,
    ai_summary: 'Thermostat not working. Customer trying DIY.',
    // V4 outcome tracking
    callback_outcome: 'resolved',
    callback_outcome_at: yesterdayAt(14).toISOString(),
    callback_outcome_note: 'Customer decided to DIY',
    last_call_tapped_at: yesterdayAt(14).toISOString(),
  },
  {
    customer_name: 'Telemarketer',
    customer_phone: `${SEED_PHONE_PREFIX}000014`,
    customer_address: null,
    status: 'lost',
    priority: 'cold',
    // V4 columns
    priority_color: 'gray',
    priority_reason: 'Spam - telemarketer',
    why_not_booked: 'SPAM - Extended warranty scam',
    issue_description: 'Extended warranty sales call',
    service_type: 'general',
    urgency: 'low',
    estimated_value: null,
    ai_summary: '[SPAM] Telemarketer.',
    // V4 outcome tracking
    callback_outcome: null,
    callback_outcome_at: null,
    callback_outcome_note: null,
    last_call_tapped_at: null,
  },
  {
    customer_name: 'Sarah Wilson',
    customer_phone: `${SEED_PHONE_PREFIX}000012`,
    customer_address: '222 West 5th Street, Austin, TX 78701',
    status: 'converted',
    priority: 'hot',
    // V4 columns
    priority_color: 'blue',
    priority_reason: 'Converted to job',
    why_not_booked: null,
    issue_description: 'AC not cooling - scheduled appointment',
    service_type: 'hvac',
    urgency: 'medium',
    estimated_value: 350,
    ai_summary: 'AC not cooling. Capacitor replaced.',
    // V4 outcome tracking
    callback_outcome: 'booked',
    callback_outcome_at: yesterdayAt(9).toISOString(),
    callback_outcome_note: 'Scheduled same-day service',
    last_call_tapped_at: yesterdayAt(9).toISOString(),
  },
];

// Completed jobs (4 total - for HISTORY + stats)
const JOBS = [
  { customer_name: 'Jennifer Adams', customer_phone: `${SEED_PHONE_PREFIX}000021`, customer_address: '700 Complete Circle, Austin, TX 78752', service_type: 'hvac', urgency: 'medium', status: 'complete', scheduled_at: yesterdayAt(14), completed_at: yesterdayAt(15, 30), estimated_value: 350, revenue: 375, ai_summary: 'Capacitor replacement. Completed.', is_ai_booked: true, booking_confirmed: true, priority_color: 'blue' },
  { customer_name: 'Amanda Foster', customer_phone: `${SEED_PHONE_PREFIX}000022`, customer_address: '800 Manual Way, Austin, TX 78753', service_type: 'hvac', urgency: 'low', status: 'complete', scheduled_at: yesterdayAt(16), completed_at: yesterdayAt(17), estimated_value: 125, revenue: 125, ai_summary: 'Tune-up completed.', is_ai_booked: false, booking_confirmed: true, priority_color: 'blue' },
  { customer_name: 'Early Bird Customer', customer_phone: `${SEED_PHONE_PREFIX}000025`, customer_address: '100 Early Street, Austin, TX 78701', service_type: 'hvac', urgency: 'medium', status: 'complete', scheduled_at: todayAt(8), completed_at: todayAt(9, 30), estimated_value: 450, revenue: 485, ai_summary: 'Refrigerant recharge. Completed.', is_ai_booked: true, booking_confirmed: true, priority_color: 'blue' },
  { customer_name: 'Morning Customer', customer_phone: `${SEED_PHONE_PREFIX}000026`, customer_address: '200 Morning Lane, Austin, TX 78702', service_type: 'hvac', urgency: 'low', status: 'complete', scheduled_at: todayAt(10), completed_at: todayAt(11), estimated_value: 275, revenue: 275, ai_summary: 'Heat pump maintenance. Completed.', is_ai_booked: true, booking_confirmed: true, priority_color: 'blue' },
];

async function seed() {
  console.log(`\n🌱 Seeding EMPTY STATE test data (V4) for user: ${seedUserEmail}\n`);
  console.log('📊 Testing: "All caught up!" empty state + historical data\n');

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, email, timezone')
    .eq('email', seedUserEmail)
    .single();

  if (userError || !user) {
    console.error(`User not found: ${seedUserEmail}`);
    process.exit(1);
  }

  console.log(`Found user: ${user.email} (${user.id})`);
  const userId = user.id;

  console.log('\n🧹 Clearing existing seed data...');
  await clearSeedData(userId);

  console.log('\n👥 Creating customers (8 total)...');
  const customersToInsert = CUSTOMERS.map(c => ({
    user_id: userId,
    name: c.name,
    phone: c.phone,
    email: c.email,
    address: c.address,
    equipment: c.equipment,
    lifetime_value: c.lifetime_value,
    total_jobs: c.total_jobs,
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

  // NO ACTIVE LEADS - this is the key for empty state

  console.log('\n📜 Creating historical leads (4 total - for HISTORY page)...');
  const historicalLeadsToInsert = HISTORICAL_LEADS.map(l => ({
    user_id: userId,
    customer_name: l.customer_name,
    customer_phone: l.customer_phone,
    customer_address: l.customer_address,
    status: l.status,
    priority: l.priority,
    // V4 columns
    priority_color: l.priority_color,
    priority_reason: l.priority_reason,
    why_not_booked: l.why_not_booked,
    issue_description: l.issue_description,
    service_type: l.service_type,
    urgency: l.urgency,
    estimated_value: l.estimated_value,
    ai_summary: l.ai_summary,
    // V4 outcome tracking
    callback_outcome: l.callback_outcome,
    callback_outcome_at: l.callback_outcome_at,
    callback_outcome_note: l.callback_outcome_note,
    last_call_tapped_at: l.last_call_tapped_at,
  }));

  const { data: insertedHistoricalLeads, error: historicalLeadsError } = await supabase
    .from('leads')
    .insert(historicalLeadsToInsert)
    .select();

  if (historicalLeadsError) {
    console.error('Error inserting historical leads:', historicalLeadsError);
    process.exit(1);
  }
  console.log(`  ✅ Created ${insertedHistoricalLeads?.length || 0} historical leads`);

  console.log('\n📋 Creating completed jobs (4 total - for HISTORY + stats)...');
  const jobsToInsert = JOBS.map((j: any) => {
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
      completed_at: j.completed_at?.toISOString() || null,
      estimated_value: j.estimated_value,
      revenue: j.revenue,
      ai_summary: j.ai_summary,
      is_ai_booked: j.is_ai_booked,
      booking_confirmed: j.booking_confirmed,
      // V4 columns
      priority_color: j.priority_color,
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

  const todayAiBooked = insertedJobs?.filter(j => j.is_ai_booked).length || 0;

  console.log('\n' + '='.repeat(70));
  console.log('🎉 EMPTY STATE test data (V4) seeded successfully!');
  console.log('='.repeat(70));
  console.log(`
📊 Data Summary:
   • Customers: ${insertedCustomers?.length || 0}
   • Active Leads: 0 (ACTION page will show empty state)
   • Historical Leads: ${insertedHistoricalLeads?.length || 0} (HISTORY page)
   • Completed Jobs: ${insertedJobs?.length || 0} (HISTORY + stats)

🎨 V4 Features Used:
   • priority_color: All leads use V4 priority colors
   • callback_outcome: Historical leads have outcome tracking
   • All jobs have priority_color set

🧪 Empty State Test:
   • ACTION page should show "All caught up!" message
   • Stats: ${todayAiBooked} AI-booked jobs today

📱 Verification:
   • ACTION page: Empty state
   • BOOKED page: Empty (no active jobs)
   • HISTORY page: ${insertedJobs?.length || 0} jobs + ${insertedHistoricalLeads?.length || 0} leads

🔗 View your dashboard at: http://localhost:3000

🧹 To clear: npm run seed:clear
`);
}

async function clearSeedData(userId: string) {
  const { error: reviewsError } = await supabase.from('ai_booking_reviews').delete().eq('user_id', userId);
  if (reviewsError) console.error('  Error clearing AI reviews:', reviewsError.message);

  const { error: leadsError } = await supabase.from('leads').delete().eq('user_id', userId).like('customer_phone', `${SEED_PHONE_PREFIX}%`);
  if (leadsError) console.error('  Error clearing leads:', leadsError.message);

  const { error: jobsError } = await supabase.from('jobs').delete().eq('user_id', userId).like('customer_phone', `${SEED_PHONE_PREFIX}%`);
  if (jobsError) console.error('  Error clearing jobs:', jobsError.message);

  const { error: customersError } = await supabase.from('customers').delete().eq('user_id', userId).like('phone', `${SEED_PHONE_PREFIX}%`);
  if (customersError) console.error('  Error clearing customers:', customersError.message);

  console.log('  ✅ Cleared existing seed data');
}

seed().catch(console.error);
