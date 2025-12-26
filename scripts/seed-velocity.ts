/**
 * Velocity Triage System Seed Script
 *
 * Creates specific test cases for the 4 Velocity archetypes:
 * - HAZARD: Safety emergencies (urgency = 'emergency' OR 'high')
 * - REVENUE: High-value opportunities (revenue_tier = 'replacement'/'major_repair' OR estimated_value >= $1500 OR priority_color = 'green')
 * - RECOVERY: Callback risk situations (priority_color = 'red')
 * - LOGISTICS: Standard admin tasks (default)
 *
 * Also creates INBOX items that should NOT appear on the Action page.
 *
 * Usage: SEED_USER_EMAIL=your@email.com npm run seed:velocity
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
  console.error('Usage: SEED_USER_EMAIL=your@email.com npm run seed:velocity');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Phone prefix for velocity seed data
const SEED_PHONE_PREFIX = '+1555835';

// ============================================================================
// DATE HELPERS
// ============================================================================

const now = new Date();

function hoursAgo(hours: number): Date {
  const d = new Date(now);
  d.setHours(d.getHours() - hours);
  return d;
}

function daysAgo(days: number): Date {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  return d;
}

function tomorrowAt(hour: number, minute = 0): Date {
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function todayAt(hour: number, minute = 0): Date {
  const d = new Date(now);
  d.setHours(hour, minute, 0, 0);
  return d;
}

// ============================================================================
// VELOCITY TEST DATA
// ============================================================================

// HAZARD: Triggers via urgency = 'emergency' OR 'high'
const HAZARD_DATA = {
  leads: [
    {
      customer_name: 'Emergency - Gas Leak',
      customer_phone: `${SEED_PHONE_PREFIX}0001`,
      customer_address: '100 Emergency Lane, Austin, TX 78701',
      status: 'callback_requested',
      priority_color: 'red',
      priority_reason: 'Active gas leak - EVACUATE',
      urgency: 'emergency',
      issue_description: 'Smell of rotten eggs in basement. Turned off gas main.',
      ai_summary: '[EMERGENCY] Customer smells gas (rotten eggs) coming from basement. Has turned off gas main. Family evacuated to front yard. Needs immediate response.',
      service_type: 'hvac',
      revenue_tier: 'diagnostic',
      revenue_tier_label: '$$?',
      estimated_value: 500,
      time_preference: 'ASAP - Emergency',
    },
  ],
  jobs: [
    {
      customer_name: 'Emergency - CO Alarm',
      customer_phone: `${SEED_PHONE_PREFIX}0002`,
      customer_address: '200 Carbon Drive, Austin, TX 78702',
      status: 'new',
      needs_action: true,
      urgency: 'emergency',
      service_type: 'hvac',
      ai_summary: '[EMERGENCY] CO detector going off upstairs. Family evacuated to neighbor house. Furnace was running when alarm triggered.',
      scheduled_at: null,
      is_ai_booked: false,
      booking_confirmed: false,
      revenue_tier: 'diagnostic',
      revenue_tier_label: '$$?',
      estimated_value: 400,
    },
  ],
};

// REVENUE: Triggers via revenue_tier = 'replacement'/'major_repair' OR estimated_value >= $1500 OR priority_color = 'green'
const REVENUE_DATA = {
  leads: [
    {
      customer_name: 'Commercial PM Contract',
      customer_phone: `${SEED_PHONE_PREFIX}0003`,
      customer_address: '300 Restaurant Row, Austin, TX 78701',
      status: 'sales_opportunity',
      priority_color: 'green',
      priority_reason: 'Commercial PM contract - 3 locations ($15k potential)',
      urgency: 'medium',
      issue_description: 'Restaurant chain needs HVAC upgrade for 3 locations.',
      ai_summary: '[HIGH VALUE] Restaurant chain owner with 3 Austin locations. Looking for preventive maintenance contract covering all sites. Current provider retiring. Wants quotes for full system upgrades at 2 locations.',
      service_type: 'hvac',
      revenue_tier: 'replacement',
      revenue_tier_label: '$$$$',
      revenue_tier_signals: ['commercial', 'pm_contract', 'multi_location'],
      estimated_value: 15000,
      time_preference: 'This week for site visit',
    },
    {
      customer_name: 'New System Quote',
      customer_phone: `${SEED_PHONE_PREFIX}0004`,
      customer_address: '400 Replacement Road, Austin, TX 78703',
      status: 'callback_requested',
      priority_color: 'blue',
      priority_reason: 'System replacement candidate - 15-year-old Carrier',
      urgency: 'medium',
      issue_description: '15-year-old Carrier unit dead. Wants replacement quote.',
      ai_summary: '[REPLACEMENT] 2008 Carrier system completely failed. Compressor seized. Customer aware of age and expecting replacement. Has already gotten one quote at $12k. Looking for second opinion.',
      service_type: 'hvac',
      revenue_tier: 'replacement',
      revenue_tier_label: '$$$$',
      revenue_tier_signals: ['replacement_candidate', 'old_equipment', 'compressor_failure'],
      estimated_value: 8500,
      time_preference: 'Tomorrow or Friday',
    },
    // NEW: Green priority with NO revenue tier and NO estimate - tests the green gap fix
    {
      customer_name: 'Property Manager - No Numbers Yet',
      customer_phone: `${SEED_PHONE_PREFIX}0012`,
      customer_address: '1200 Property Lane, Austin, TX 78709',
      status: 'callback_requested',
      priority_color: 'green',
      priority_reason: 'Property manager - high LTV potential',
      urgency: 'low',
      issue_description: 'Property manager inquiring about service for apartment complex.',
      ai_summary: '[COMMERCIAL] Property manager for 24-unit apartment complex. Just moved management to this company. Looking for reliable HVAC contractor. No specific issue yet - wants to establish relationship.',
      service_type: 'hvac',
      revenue_tier: null,  // NO tier set
      revenue_tier_label: null,
      revenue_tier_signals: ['property_manager', 'multi_unit'],
      estimated_value: null,  // NO estimate set
      time_preference: 'Next week',
    },
  ],
};

// RECOVERY: Triggers via priority_color = 'red' (but NOT high urgency, else it's HAZARD)
const RECOVERY_DATA = {
  leads: [
    {
      customer_name: 'Angry Callback - Muddy Carpet',
      customer_phone: `${SEED_PHONE_PREFIX}0005`,
      customer_address: '500 Upset Avenue, Austin, TX 78704',
      status: 'callback_requested',
      priority_color: 'red',
      priority_reason: 'Technician tracked mud on carpet - demanding manager',
      urgency: 'low', // Low urgency so it stays RECOVERY, not HAZARD
      issue_description: 'Technician tracked mud on carpet. Wants manager call.',
      ai_summary: '[CALLBACK RISK] Very upset. Tech Mike came yesterday for tune-up, tracked mud across white carpet. Customer wants owner/manager to call about cleaning bill. Mentioned leaving negative review.',
      service_type: 'hvac',
      revenue_tier: 'minor',
      revenue_tier_label: '$',
      estimated_value: 0,
      time_preference: 'Manager call today',
    },
    {
      customer_name: 'Billing Dispute',
      customer_phone: `${SEED_PHONE_PREFIX}0006`,
      customer_address: '600 Dispute Drive, Austin, TX 78705',
      status: 'abandoned',
      priority_color: 'red',
      priority_reason: 'Upset about diagnostic fee - hung up on AI',
      urgency: 'low', // Low urgency so it stays RECOVERY, not HAZARD
      issue_description: 'Upset about diagnostic fee. Hung up on AI.',
      ai_summary: '[CALLBACK RISK] Customer called to dispute $89 diagnostic fee from last week. Says tech was only there 10 minutes. Demanded refund. Hung up when AI tried to explain policy. Previous customer - 2 jobs in past year.',
      service_type: 'hvac',
      revenue_tier: null,
      revenue_tier_label: null,
      estimated_value: 0,
      time_preference: null,
    },
  ],
  // Context: Past job for "Angry Callback" customer to populate the Recovery Card context box
  pastJobs: [
    {
      customer_name: 'Angry Callback - Muddy Carpet',
      customer_phone: `${SEED_PHONE_PREFIX}0005`,
      customer_address: '500 Upset Avenue, Austin, TX 78704',
      status: 'complete',
      urgency: 'low',
      service_type: 'hvac',
      ai_summary: 'Seasonal tune-up completed. Cleaned condenser coils and checked refrigerant levels.',
      scheduled_at: daysAgo(1),
      completed_at: daysAgo(1),
      is_ai_booked: false,
      booking_confirmed: true,
      revenue_tier: 'minor',
      revenue_tier_label: '$',
      estimated_value: 150,
      revenue: 150,
      technician_name: 'Mike',
    },
  ],
};

// LOGISTICS: Default archetype (no emergency, no high value, no red priority)
const LOGISTICS_DATA = {
  jobs: [
    {
      customer_name: 'Scheduling Conflict',
      customer_phone: `${SEED_PHONE_PREFIX}0007`,
      customer_address: '700 Reschedule Road, Austin, TX 78706',
      status: 'new',
      needs_action: true,
      urgency: 'low',
      service_type: 'hvac',
      ai_summary: 'Customer needs to reschedule Tuesday appointment. Has conflict with work meeting. Prefers Thursday or Friday morning.',
      scheduled_at: tomorrowAt(9),
      is_ai_booked: true,
      booking_confirmed: false,
      revenue_tier: 'standard_repair',
      revenue_tier_label: '$$',
      estimated_value: 250,
    },
  ],
  leads: [
    {
      customer_name: 'General Inquiry',
      customer_phone: `${SEED_PHONE_PREFIX}0008`,
      customer_address: '800 Question Lane, Austin, TX 78745',
      status: 'info_only',
      priority_color: 'blue',
      priority_reason: 'Service area question',
      urgency: 'low',
      issue_description: 'Asking if we service 78745 area code.',
      ai_summary: 'Customer calling to check if we service the 78745 zip code area. No current service need - just moved to area and researching HVAC companies.',
      service_type: 'general',
      revenue_tier: null,
      revenue_tier_label: null,
      estimated_value: 0,
      time_preference: null,
    },
  ],
};

// INBOX: Items that should NOT appear on Action page
const INBOX_DATA = {
  jobs: [
    // Booked job (status = confirmed) - should NOT appear in velocity
    {
      customer_name: 'Booked Job - Confirmed',
      customer_phone: `${SEED_PHONE_PREFIX}0009`,
      customer_address: '900 Booked Boulevard, Austin, TX 78707',
      status: 'confirmed',
      needs_action: false,
      urgency: 'medium',
      service_type: 'hvac',
      ai_summary: 'AI booked appointment for AC tune-up. Customer confirmed via text.',
      scheduled_at: tomorrowAt(14),
      is_ai_booked: true,
      booking_confirmed: true,
      revenue_tier: 'minor',
      revenue_tier_label: '$',
      estimated_value: 150,
    },
  ],
  leads: [
    // Spam call (gray + lost) - should NOT appear in velocity
    {
      customer_name: 'Spam Call - Duct Cleaning',
      customer_phone: `${SEED_PHONE_PREFIX}0010`,
      customer_address: null,
      status: 'lost',
      priority_color: 'gray',
      priority_reason: 'Spam - duct cleaning sales call',
      urgency: 'low',
      issue_description: 'Duct cleaning service trying to sell',
      ai_summary: '[SPAM] Duct cleaning company sales call. Not a customer.',
      service_type: 'general',
      revenue_tier: null,
      revenue_tier_label: null,
      estimated_value: null,
      time_preference: null,
    },
    // Resolved issue (callback_outcome = resolved) - should NOT appear in velocity
    {
      customer_name: 'Resolved Issue',
      customer_phone: `${SEED_PHONE_PREFIX}0011`,
      customer_address: '1100 Resolved Street, Austin, TX 78708',
      status: 'converted',
      priority_color: 'blue',
      priority_reason: 'Issue resolved over phone',
      urgency: 'low',
      issue_description: 'Thermostat question - resolved over phone',
      ai_summary: 'Customer called about thermostat settings. Walked through programming over phone. Issue resolved - no service visit needed.',
      service_type: 'hvac',
      revenue_tier: null,
      revenue_tier_label: null,
      estimated_value: 0,
      callback_outcome: 'resolved',
      callback_outcome_at: hoursAgo(2).toISOString(),
      callback_outcome_note: 'Helped customer program thermostat schedule',
      time_preference: null,
    },
  ],
};

// ============================================================================
// CUSTOMERS
// ============================================================================

const CUSTOMERS = [
  // HAZARD customers
  { name: 'Emergency - Gas Leak', phone: `${SEED_PHONE_PREFIX}0001`, address: '100 Emergency Lane, Austin, TX 78701', equipment: [{ type: 'Gas Furnace', brand: 'Lennox', year: 2018 }], lifetime_value: 0, total_jobs: 0 },
  { name: 'Emergency - CO Alarm', phone: `${SEED_PHONE_PREFIX}0002`, address: '200 Carbon Drive, Austin, TX 78702', equipment: [{ type: 'Gas Furnace', brand: 'Carrier', year: 2015 }], lifetime_value: 0, total_jobs: 0 },
  // REVENUE customers
  { name: 'Commercial PM Contract', phone: `${SEED_PHONE_PREFIX}0003`, address: '300 Restaurant Row, Austin, TX 78701', equipment: [{ type: 'Commercial RTU', brand: 'Carrier', year: 2016 }], lifetime_value: 0, total_jobs: 0, notes: 'COMMERCIAL - Restaurant chain owner' },
  { name: 'New System Quote', phone: `${SEED_PHONE_PREFIX}0004`, address: '400 Replacement Road, Austin, TX 78703', equipment: [{ type: 'Central AC', brand: 'Carrier', model: '24ACC6', year: 2008 }], lifetime_value: 450, total_jobs: 3, notes: '15-year-old system' },
  { name: 'Property Manager - No Numbers Yet', phone: `${SEED_PHONE_PREFIX}0012`, address: '1200 Property Lane, Austin, TX 78709', equipment: [], lifetime_value: 0, total_jobs: 0, notes: 'COMMERCIAL - Property manager, 24-unit complex' },
  // RECOVERY customers
  { name: 'Angry Callback - Muddy Carpet', phone: `${SEED_PHONE_PREFIX}0005`, address: '500 Upset Avenue, Austin, TX 78704', equipment: [{ type: 'Central AC', brand: 'Trane', year: 2020 }], lifetime_value: 300, total_jobs: 2, notes: 'VIP - Handle with care' },
  { name: 'Billing Dispute', phone: `${SEED_PHONE_PREFIX}0006`, address: '600 Dispute Drive, Austin, TX 78705', equipment: [{ type: 'Heat Pump', brand: 'Rheem', year: 2019 }], lifetime_value: 178, total_jobs: 2 },
  // LOGISTICS customers
  { name: 'Scheduling Conflict', phone: `${SEED_PHONE_PREFIX}0007`, address: '700 Reschedule Road, Austin, TX 78706', equipment: [{ type: 'Central AC', brand: 'Goodman', year: 2021 }], lifetime_value: 0, total_jobs: 0 },
  { name: 'General Inquiry', phone: `${SEED_PHONE_PREFIX}0008`, address: '800 Question Lane, Austin, TX 78745', equipment: [], lifetime_value: 0, total_jobs: 0 },
  // INBOX customers
  { name: 'Booked Job - Confirmed', phone: `${SEED_PHONE_PREFIX}0009`, address: '900 Booked Boulevard, Austin, TX 78707', equipment: [{ type: 'Central AC', brand: 'Lennox', year: 2022 }], lifetime_value: 150, total_jobs: 1 },
  { name: 'Spam Call - Duct Cleaning', phone: `${SEED_PHONE_PREFIX}0010`, address: null, equipment: [], lifetime_value: 0, total_jobs: 0 },
  { name: 'Resolved Issue', phone: `${SEED_PHONE_PREFIX}0011`, address: '1100 Resolved Street, Austin, TX 78708', equipment: [{ type: 'Smart Thermostat', brand: 'Nest', year: 2023 }], lifetime_value: 0, total_jobs: 0 },
];

// ============================================================================
// SEED FUNCTION
// ============================================================================

async function seedVelocity() {
  console.log(`\n🚀 Seeding VELOCITY TRIAGE test data for user: ${seedUserEmail}\n`);
  console.log('📊 Creating test cases for: HAZARD, REVENUE, RECOVERY, LOGISTICS\n');

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

  // 2. Clear ALL existing data for this user
  console.log('\n🧹 Clearing ALL existing data for this user...');
  await clearAllData(userId);

  // 3. Insert customers
  console.log('\n👥 Creating customers...');
  const customersToInsert = CUSTOMERS.map(c => ({
    user_id: userId,
    name: c.name,
    phone: c.phone,
    email: null,
    address: c.address,
    equipment: c.equipment,
    notes: c.notes || null,
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

  // Track counts
  const counts = { HAZARD: 0, REVENUE: 0, RECOVERY: 0, LOGISTICS: 0, INBOX: 0 };

  // 4. Insert HAZARD leads
  console.log('\n🔴 Creating HAZARD items (emergency/high urgency)...');
  for (const lead of HAZARD_DATA.leads) {
    const { error } = await supabase.from('leads').insert({
      user_id: userId,
      ...lead,
    });
    if (error) console.error('  Error:', error.message);
    else counts.HAZARD++;
  }
  for (const job of HAZARD_DATA.jobs) {
    const customer = insertedCustomers?.find(c => c.phone === job.customer_phone);
    const { error } = await supabase.from('jobs').insert({
      user_id: userId,
      customer_id: customer?.id || null,
      ...job,
    });
    if (error) console.error('  Error:', error.message);
    else counts.HAZARD++;
  }
  console.log(`  ✅ Created ${counts.HAZARD} HAZARD items`);

  // 5. Insert REVENUE leads
  console.log('\n💰 Creating REVENUE items (high value)...');
  for (const lead of REVENUE_DATA.leads) {
    const { error } = await supabase.from('leads').insert({
      user_id: userId,
      ...lead,
    });
    if (error) console.error('  Error:', error.message);
    else counts.REVENUE++;
  }
  console.log(`  ✅ Created ${counts.REVENUE} REVENUE items`);

  // 6. Insert RECOVERY leads + past job for context
  console.log('\n🔄 Creating RECOVERY items (callback risk)...');
  for (const lead of RECOVERY_DATA.leads) {
    const { error } = await supabase.from('leads').insert({
      user_id: userId,
      ...lead,
    });
    if (error) console.error('  Error:', error.message);
    else counts.RECOVERY++;
  }
  // Past job for context
  for (const job of RECOVERY_DATA.pastJobs) {
    const customer = insertedCustomers?.find(c => c.phone === job.customer_phone);
    const { error } = await supabase.from('jobs').insert({
      user_id: userId,
      customer_id: customer?.id || null,
      customer_name: job.customer_name,
      customer_phone: job.customer_phone,
      customer_address: job.customer_address,
      status: job.status,
      urgency: job.urgency,
      service_type: job.service_type,
      ai_summary: job.ai_summary,
      scheduled_at: job.scheduled_at.toISOString(),
      completed_at: job.completed_at.toISOString(),
      is_ai_booked: job.is_ai_booked,
      booking_confirmed: job.booking_confirmed,
      revenue_tier: job.revenue_tier,
      revenue_tier_label: job.revenue_tier_label,
      estimated_value: job.estimated_value,
      revenue: job.revenue,
    });
    if (error) console.error('  Error creating past job:', error.message);
    else console.log('  ✅ Created past job for RECOVERY context (completed by Mike yesterday)');
  }
  console.log(`  ✅ Created ${counts.RECOVERY} RECOVERY items`);

  // 7. Insert LOGISTICS items
  console.log('\n📋 Creating LOGISTICS items (standard admin)...');
  for (const job of LOGISTICS_DATA.jobs) {
    const customer = insertedCustomers?.find(c => c.phone === job.customer_phone);
    const { error } = await supabase.from('jobs').insert({
      user_id: userId,
      customer_id: customer?.id || null,
      customer_name: job.customer_name,
      customer_phone: job.customer_phone,
      customer_address: job.customer_address,
      status: job.status,
      needs_action: job.needs_action,
      urgency: job.urgency,
      service_type: job.service_type,
      ai_summary: job.ai_summary,
      scheduled_at: job.scheduled_at.toISOString(),
      is_ai_booked: job.is_ai_booked,
      booking_confirmed: job.booking_confirmed,
      revenue_tier: job.revenue_tier,
      revenue_tier_label: job.revenue_tier_label,
      estimated_value: job.estimated_value,
    });
    if (error) console.error('  Error:', error.message);
    else counts.LOGISTICS++;
  }
  for (const lead of LOGISTICS_DATA.leads) {
    const { error } = await supabase.from('leads').insert({
      user_id: userId,
      ...lead,
    });
    if (error) console.error('  Error:', error.message);
    else counts.LOGISTICS++;
  }
  console.log(`  ✅ Created ${counts.LOGISTICS} LOGISTICS items`);

  // 8. Insert INBOX items (should NOT appear on Action page)
  console.log('\n📥 Creating INBOX items (should NOT appear on Action)...');
  for (const job of INBOX_DATA.jobs) {
    const customer = insertedCustomers?.find(c => c.phone === job.customer_phone);
    const { error } = await supabase.from('jobs').insert({
      user_id: userId,
      customer_id: customer?.id || null,
      customer_name: job.customer_name,
      customer_phone: job.customer_phone,
      customer_address: job.customer_address,
      status: job.status,
      needs_action: job.needs_action,
      urgency: job.urgency,
      service_type: job.service_type,
      ai_summary: job.ai_summary,
      scheduled_at: job.scheduled_at.toISOString(),
      is_ai_booked: job.is_ai_booked,
      booking_confirmed: job.booking_confirmed,
      revenue_tier: job.revenue_tier,
      revenue_tier_label: job.revenue_tier_label,
      estimated_value: job.estimated_value,
    });
    if (error) console.error('  Error:', error.message);
    else counts.INBOX++;
  }
  for (const lead of INBOX_DATA.leads) {
    const { error } = await supabase.from('leads').insert({
      user_id: userId,
      ...lead,
    });
    if (error) console.error('  Error:', error.message);
    else counts.INBOX++;
  }
  console.log(`  ✅ Created ${counts.INBOX} INBOX items`);

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('🎉 VELOCITY TRIAGE test data seeded successfully!');
  console.log('='.repeat(70));
  console.log(`
📊 Summary:
   • HAZARD (Emergency):  ${counts.HAZARD} items (Gas Leak, CO Alarm)
   • REVENUE (High $$$):  ${counts.REVENUE} items (Commercial PM, System Quote, Property Manager)
   • RECOVERY (Red Flag): ${counts.RECOVERY} items (Angry Callback, Billing Dispute)
   • LOGISTICS (Admin):   ${counts.LOGISTICS} items (Scheduling, Inquiry)
   • INBOX (Hidden):      ${counts.INBOX} items (Booked, Spam, Resolved)

🧪 Test Cases:
   HAZARD:
   - "Emergency - Gas Leak" → Lead with urgency='emergency'
   - "Emergency - CO Alarm" → Job with urgency='emergency', needs_action=true

   REVENUE:
   - "Commercial PM Contract" → Lead with revenue_tier='replacement', est_value=$15,000
   - "New System Quote" → Lead with revenue_tier='replacement', est_value=$8,500
   - "Property Manager - No Numbers Yet" → Lead with priority_color='green', NO tier, NO estimate (tests green gap fix)

   RECOVERY:
   - "Angry Callback" → Lead with priority_color='red' + past completed job
   - "Billing Dispute" → Lead with priority_color='red', status='abandoned'

   LOGISTICS:
   - "Scheduling Conflict" → Job with status='new', needs_action=true
   - "General Inquiry" → Lead with priority_color='blue', status='info_only'

   INBOX (verify these do NOT appear on /action):
   - "Booked Job" → Job with status='confirmed'
   - "Spam Call" → Lead with priority_color='gray', status='lost'
   - "Resolved Issue" → Lead with callback_outcome='resolved'

🔗 View your dashboard at: http://localhost:3000/action

🧪 API Verification:
   GET /api/velocity              → Should return 9 action items
   GET /api/velocity?archetype=HAZARD   → Should return 2 items
   GET /api/velocity?archetype=REVENUE  → Should return 3 items
   GET /api/velocity?archetype=RECOVERY → Should return 2 items
   GET /api/velocity?archetype=LOGISTICS → Should return 2 items
`);
}

async function clearAllData(userId: string) {
  // Delete ALL data for this user (not just seed-prefixed)

  // AI booking reviews first (depends on jobs)
  const { error: reviewsError } = await supabase
    .from('ai_booking_reviews')
    .delete()
    .eq('user_id', userId);
  if (reviewsError) console.error('  Error clearing AI reviews:', reviewsError.message);

  // Operator notes (may depend on leads)
  const { error: notesError } = await supabase
    .from('operator_notes')
    .delete()
    .eq('user_id', userId);
  if (notesError) console.error('  Error clearing operator notes:', notesError.message);

  // Leads
  const { error: leadsError } = await supabase
    .from('leads')
    .delete()
    .eq('user_id', userId);
  if (leadsError) console.error('  Error clearing leads:', leadsError.message);

  // Jobs
  const { error: jobsError } = await supabase
    .from('jobs')
    .delete()
    .eq('user_id', userId);
  if (jobsError) console.error('  Error clearing jobs:', jobsError.message);

  // Customers
  const { error: customersError } = await supabase
    .from('customers')
    .delete()
    .eq('user_id', userId);
  if (customersError) console.error('  Error clearing customers:', customersError.message);

  // Calls (if exists)
  const { error: callsError } = await supabase
    .from('calls')
    .delete()
    .eq('user_id', userId);
  if (callsError && !callsError.message.includes('does not exist')) {
    console.error('  Error clearing calls:', callsError.message);
  }

  // Emergency alerts (if exists)
  const { error: alertsError } = await supabase
    .from('emergency_alerts')
    .delete()
    .eq('user_id', userId);
  if (alertsError && !alertsError.message.includes('does not exist')) {
    console.error('  Error clearing alerts:', alertsError.message);
  }

  console.log('  ✅ Cleared all existing data');
}

// Run
seedVelocity().catch(console.error);
