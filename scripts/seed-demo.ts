/**
 * Demo Seed Data - "Tuesday at 2 PM - You Were On a Roof"
 *
 * Purpose: Sales demo seed data that tells a compelling story
 * Scenario: Solo contractor was on a job from 11 AM to 3 PM. Phone rang 8 times.
 *
 * Key demo points:
 * - 1 RED emergency (baby, $800) - would have lost to competitor
 * - 1 GREEN commercial (dental office, recurring revenue)
 * - 1 GREEN replacement ($9K big fish)
 * - 1 BLUE standard repair
 * - 1 GRAY vendor (filtered)
 * - 3 BOOKED jobs (AI completed automatically)
 * - OVERLAP: 1:15 PM + 1:18 PM calls handled simultaneously
 *
 * Usage: SEED_USER_EMAIL=your@email.com npm run seed:demo
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
  console.error('Usage: SEED_USER_EMAIL=your@email.com npm run seed:demo');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Phone prefix for demo data (easy cleanup)
const DEMO_PHONE_PREFIX = '+15559';

// ============================================================================
// DATE HELPERS - All timestamps relative to NOW for fresh demo feel
// ============================================================================

const now = new Date();
const today = new Date(now);
today.setHours(0, 0, 0, 0);

const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);

const thursday = new Date(today);
thursday.setDate(thursday.getDate() + (4 - today.getDay() + 7) % 7 || 7); // Next Thursday

function todayAt(hour: number, minute = 0): Date {
  const d = new Date(today);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function tomorrowAt(hour: number, minute = 0): Date {
  const d = new Date(tomorrow);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function thursdayAt(hour: number, minute = 0): Date {
  const d = new Date(thursday);
  d.setHours(hour, minute, 0, 0);
  return d;
}

// ============================================================================
// CUSTOMERS (8 total - focused for demo)
// ============================================================================

const DEMO_CUSTOMERS = [
  // ACTION leads customers
  {
    name: 'Marcus Williams',
    phone: `${DEMO_PHONE_PREFIX}00147`,
    email: 'marcus.williams@email.com',
    address: '2847 Riverside Dr, Austin, TX 78745',
    equipment: [{ type: 'Central AC', brand: 'Carrier', model: '24ACC636', year: 2016, location: 'Backyard' }],
    notes: 'Emergency - has 6-month-old baby',
    lifetime_value: 0,
    total_jobs: 0,
  },
  {
    name: 'Diana Reyes',
    phone: `${DEMO_PHONE_PREFIX}00234`,
    email: 'diana.reyes@email.com',
    address: '1456 Oak Hill Blvd, Austin, TX 78749',
    equipment: [{ type: 'Central AC', brand: 'Trane', year: 2019, location: 'Side yard' }],
    notes: 'Works from home, flexible scheduling',
    lifetime_value: 0,
    total_jobs: 0,
  },
  {
    name: 'Dr. Sarah Chen',
    phone: `${DEMO_PHONE_PREFIX}00445`,
    email: 'sarah@brightsmilesdental.com',
    address: '3200 South Lamar Blvd, Suite 100, Austin, TX 78704',
    equipment: [{ type: 'Commercial Split', brand: 'Lennox', year: 2018, location: 'Rooftop' }],
    notes: 'COMMERCIAL - Bright Smiles Dental - office manager handles scheduling',
    lifetime_value: 0,
    total_jobs: 0,
  },
  {
    name: 'Tom Brennan',
    phone: `${DEMO_PHONE_PREFIX}00892`,
    email: 'tom.brennan@email.com',
    address: '5621 Manchaca Rd, Austin, TX 78745',
    equipment: [{ type: 'Central AC + Furnace', brand: 'Trane', year: 2006, location: 'Attic' }],
    notes: 'System is 18 years old - replacement candidate',
    lifetime_value: 0,
    total_jobs: 0,
  },
  {
    name: 'Apex HVAC Supply',
    phone: `${DEMO_PHONE_PREFIX}09999`,
    email: null,
    address: '',
    equipment: [],
    notes: 'VENDOR - Parts supplier sales call',
    lifetime_value: 0,
    total_jobs: 0,
  },
  // BOOKED jobs customers
  {
    name: 'Robert Kim',
    phone: `${DEMO_PHONE_PREFIX}00321`,
    email: 'robert.kim@email.com',
    address: '789 Barton Springs Rd, Austin, TX 78704',
    equipment: [{ type: 'Central AC', brand: 'Goodman', year: 2020, location: 'Backyard' }],
    notes: 'Regular maintenance customer',
    lifetime_value: 275,
    total_jobs: 1,
  },
  {
    name: 'Angela Morrison',
    phone: `${DEMO_PHONE_PREFIX}00567`,
    email: 'angela.morrison@email.com',
    address: '4523 Stassney Lane, Austin, TX 78745',
    equipment: [{ type: 'Central AC', brand: 'Rheem', year: 2017, location: 'Side yard' }],
    notes: null,
    lifetime_value: 0,
    total_jobs: 0,
  },
  {
    name: 'Dave Chen',
    phone: `${DEMO_PHONE_PREFIX}00678`,
    email: 'dave.chen@email.com',
    address: '1100 Congress Ave, Apt 405, Austin, TX 78701',
    equipment: [{ type: 'Central AC', brand: 'Carrier', year: 2019, location: 'Utility closet' }],
    notes: 'Downtown condo - thermostat issue',
    lifetime_value: 0,
    total_jobs: 0,
  },
];

// ============================================================================
// ACTION LEADS (5 total - the story)
// ============================================================================

const DEMO_LEADS = [
  // #1 - RED: Marcus Williams - Emergency with baby
  {
    customer_name: 'Marcus Williams',
    customer_phone: `${DEMO_PHONE_PREFIX}00147`,
    customer_address: '2847 Riverside Dr, Austin, TX 78745',
    status: 'callback_requested',
    priority: 'hot',
    priority_color: 'red',
    priority_reason: 'Emergency - baby in home, 84°F and rising',
    why_not_booked: 'Requested same-day emergency. AI promised callback within 15 minutes.',
    issue_description: 'AC just stopped working. 84 degrees inside with 6-month-old baby.',
    service_type: 'hvac',
    urgency: 'emergency',
    estimated_value: 650,
    ai_summary: `AC stopped working this morning - temperature already at 84°F and rising. Has a 6-month-old baby in the home, needs same-day service urgently. System is a Carrier central AC, approximately 8 years old. Customer very concerned about baby's safety in the heat.`,
    revenue_tier: 'major_repair',
    revenue_tier_label: '$$$',
    revenue_tier_description: 'Emergency service call + likely repair',
    revenue_tier_signals: ['emergency', 'complete_failure', 'same_day_needed'],
    revenue_confidence: 'high',
    problem_duration: 'Started this morning',
    problem_pattern: 'Complete failure - no cooling at all',
    time_preference: 'TODAY - ASAP',
    created_at: todayAt(11, 47).toISOString(),
  },
  // #2 - BLUE: Diana Reyes - Standard repair
  {
    customer_name: 'Diana Reyes',
    customer_phone: `${DEMO_PHONE_PREFIX}00234`,
    customer_address: '1456 Oak Hill Blvd, Austin, TX 78749',
    status: 'callback_requested',
    priority: 'warm',
    priority_color: 'blue',
    priority_reason: 'Standard residential lead',
    why_not_booked: 'Wanted to check with husband on timing before committing.',
    issue_description: 'AC blowing warm air since yesterday morning.',
    service_type: 'hvac',
    urgency: 'medium',
    estimated_value: 325,
    ai_summary: `AC started blowing warm air yesterday morning. Was working fine the day before. Not an emergency but would like someone this week. Works from home so scheduling is flexible. System is about 5 years old. Mentioned it might need refrigerant - neighbor had similar issue.`,
    revenue_tier: 'standard_repair',
    revenue_tier_label: '$$',
    revenue_tier_description: 'Likely capacitor or refrigerant',
    revenue_tier_signals: ['warm_air', 'recent_onset'],
    revenue_confidence: 'medium',
    problem_duration: 'Since yesterday',
    problem_pattern: 'Constant - blowing but not cold',
    time_preference: 'This week, flexible',
    created_at: todayAt(12, 23).toISOString(),
  },
  // #3 - GREEN: Dr. Sarah Chen - Commercial (Dental Office)
  {
    customer_name: 'Dr. Sarah Chen',
    customer_phone: `${DEMO_PHONE_PREFIX}00445`,
    customer_address: '3200 South Lamar Blvd, Suite 100, Austin, TX 78704',
    status: 'callback_requested',
    priority: 'hot',
    priority_color: 'green',
    priority_reason: 'Commercial customer - dental office, relationship potential',
    why_not_booked: 'Office manager handles scheduling. Will have them call back.',
    issue_description: 'Waiting room AC not cooling properly. Patients uncomfortable.',
    service_type: 'hvac',
    urgency: 'high',
    estimated_value: 550,
    ai_summary: `Dental office - waiting room AC not cooling properly, patients uncomfortable. Has appointments all afternoon. Needs service today or tomorrow. Office manager handles scheduling and will call back to confirm time. Good opportunity for ongoing commercial relationship.`,
    revenue_tier: 'major_repair',
    revenue_tier_label: '$$$',
    revenue_tier_description: 'Commercial service + relationship potential',
    revenue_tier_signals: ['commercial', 'dental_office', 'recurring_potential'],
    revenue_confidence: 'high',
    problem_duration: 'Started this morning',
    problem_pattern: 'Cooling but not enough',
    time_preference: 'Today or tomorrow',
    created_at: todayAt(13, 15).toISOString(), // 1:15 PM - OVERLAP
  },
  // #4 - GREEN: Tom Brennan - Replacement lead ($9K big fish)
  {
    customer_name: 'Tom Brennan',
    customer_phone: `${DEMO_PHONE_PREFIX}00892`,
    customer_address: '5621 Manchaca Rd, Austin, TX 78745',
    status: 'callback_requested',
    priority: 'hot',
    priority_color: 'green',
    priority_reason: '18-year-old system - $8K-12K replacement opportunity',
    why_not_booked: 'Wants in-home estimate. Needs to check with wife on timing.',
    issue_description: 'Quote for full system replacement. Current system is 18 years old.',
    service_type: 'hvac',
    urgency: 'low',
    estimated_value: 9500,
    ai_summary: `Wants quote on replacing entire HVAC system - current system is 18 years old. Repair tech last year recommended they start planning replacement. Not broken, just planning ahead before summer. Both homeowners need to be present for estimate. Flexible on timing but wants to get numbers soon.`,
    revenue_tier: 'replacement',
    revenue_tier_label: '$$$$',
    revenue_tier_description: 'Full system replacement',
    revenue_tier_signals: ['18_years_old', 'replacement_intent', 'planning_purchase'],
    revenue_confidence: 'high',
    problem_duration: null,
    problem_pattern: null,
    time_preference: 'Before summer, flexible',
    created_at: todayAt(13, 18).toISOString(), // 1:18 PM - OVERLAP with Dr. Chen
  },
  // #5 - GRAY: Apex HVAC Supply - Vendor (filtered)
  {
    customer_name: 'Apex HVAC Supply',
    customer_phone: `${DEMO_PHONE_PREFIX}09999`,
    customer_address: null,
    status: 'info_only',
    priority: 'cold',
    priority_color: 'gray',
    priority_reason: 'Vendor sales call - auto-filtered',
    why_not_booked: 'Not a customer - vendor sales call',
    issue_description: 'Vendor calling about parts account pricing',
    service_type: 'general',
    urgency: 'low',
    estimated_value: null,
    ai_summary: `Sales call from Apex HVAC Supply about parts account and new pricing - not a customer service request. Politely ended call and filtered.`,
    revenue_tier: null,
    revenue_tier_label: null,
    revenue_tier_description: null,
    revenue_tier_signals: null,
    revenue_confidence: null,
    problem_duration: null,
    problem_pattern: null,
    time_preference: null,
    created_at: todayAt(14, 2).toISOString(),
  },
];

// ============================================================================
// BOOKED JOBS (3 total - AI completed these)
// ============================================================================

const DEMO_JOBS = [
  // #1 - Robert Kim - Tune-up (routine, AI booked)
  {
    customer_name: 'Robert Kim',
    customer_phone: `${DEMO_PHONE_PREFIX}00321`,
    customer_address: '789 Barton Springs Rd, Austin, TX 78704',
    service_type: 'hvac',
    urgency: 'low',
    status: 'confirmed',
    scheduled_at: tomorrowAt(9, 0),
    estimated_value: 150,
    ai_summary: `Seasonal AC tune-up before summer. Wants to make sure system is ready. Last service was a year ago. AI confirmed appointment for tomorrow morning.`,
    is_ai_booked: true,
    booking_confirmed: true,
    revenue_tier: 'minor',
    revenue_tier_label: '$',
    created_at: todayAt(11, 12).toISOString(),
  },
  // #2 - Angela Morrison - Grinding noise (AI booked)
  {
    customer_name: 'Angela Morrison',
    customer_phone: `${DEMO_PHONE_PREFIX}00567`,
    customer_address: '4523 Stassney Lane, Austin, TX 78745',
    service_type: 'hvac',
    urgency: 'medium',
    status: 'confirmed',
    scheduled_at: tomorrowAt(14, 0),
    estimated_value: 375,
    ai_summary: `AC making grinding noise. Still cooling but noise is getting louder. Worried it might fail soon. Asked for tomorrow afternoon. AI booked 2 PM slot. Likely fan motor or bearing issue.`,
    is_ai_booked: true,
    booking_confirmed: true,
    revenue_tier: 'standard_repair',
    revenue_tier_label: '$$',
    created_at: todayAt(13, 48).toISOString(),
  },
  // #3 - Dave Chen - Thermostat issue (AI booked)
  {
    customer_name: 'Dave Chen',
    customer_phone: `${DEMO_PHONE_PREFIX}00678`,
    customer_address: '1100 Congress Ave, Apt 405, Austin, TX 78701',
    service_type: 'hvac',
    urgency: 'medium',
    status: 'confirmed',
    scheduled_at: thursdayAt(10, 0),
    estimated_value: 275,
    ai_summary: `Thermostat stopped responding. Screen is on but system won't cool. Tried resetting it, no luck. Downtown condo. AI scheduled for Thursday morning. Could be thermostat or wiring issue.`,
    is_ai_booked: true,
    booking_confirmed: true,
    revenue_tier: 'standard_repair',
    revenue_tier_label: '$$',
    created_at: todayAt(15, 15).toISOString(),
  },
];

// ============================================================================
// SEED FUNCTION
// ============================================================================

async function seedDemo() {
  console.log(`\n🎬 Seeding DEMO data for user: ${seedUserEmail}\n`);
  console.log('📖 Scenario: "Tuesday at 2 PM - You Were On a Roof"\n');

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

  // 2. Clear existing demo data
  console.log('\n🧹 Clearing existing demo data...');
  await clearDemoData(userId);

  // 3. Insert customers
  console.log('\n👥 Creating demo customers...');
  const customersToInsert = DEMO_CUSTOMERS.map(c => ({
    user_id: userId,
    name: c.name,
    phone: c.phone,
    email: c.email,
    address: c.address,
    equipment: c.equipment,
    notes: c.notes,
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

  // 4. Insert ACTION leads
  console.log('\n📞 Creating ACTION leads (5 total)...');
  const leadsToInsert = DEMO_LEADS.map(l => ({
    user_id: userId,
    customer_name: l.customer_name,
    customer_phone: l.customer_phone,
    customer_address: l.customer_address,
    status: l.status,
    priority: l.priority,
    priority_color: l.priority_color,
    priority_reason: l.priority_reason,
    why_not_booked: l.why_not_booked,
    issue_description: l.issue_description,
    service_type: l.service_type,
    urgency: l.urgency,
    estimated_value: l.estimated_value,
    ai_summary: l.ai_summary,
    revenue_tier: l.revenue_tier,
    revenue_tier_label: l.revenue_tier_label,
    revenue_tier_description: l.revenue_tier_description,
    revenue_tier_signals: l.revenue_tier_signals,
    revenue_confidence: l.revenue_confidence,
    problem_duration: l.problem_duration,
    problem_pattern: l.problem_pattern,
    time_preference: l.time_preference,
    created_at: l.created_at,
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

  // Log priority colors
  const colorCounts = {
    red: insertedLeads?.filter(l => l.priority_color === 'red').length || 0,
    green: insertedLeads?.filter(l => l.priority_color === 'green').length || 0,
    blue: insertedLeads?.filter(l => l.priority_color === 'blue').length || 0,
    gray: insertedLeads?.filter(l => l.priority_color === 'gray').length || 0,
  };
  console.log(`     🔴 RED: ${colorCounts.red} | 🟢 GREEN: ${colorCounts.green} | 🔵 BLUE: ${colorCounts.blue} | ⚪ GRAY: ${colorCounts.gray}`);

  // 5. Insert BOOKED jobs
  console.log('\n📋 Creating BOOKED jobs (3 total)...');
  const jobsToInsert = DEMO_JOBS.map(j => {
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
      estimated_value: j.estimated_value,
      ai_summary: j.ai_summary,
      is_ai_booked: j.is_ai_booked,
      booking_confirmed: j.booking_confirmed,
      revenue_tier: j.revenue_tier,
      revenue_tier_label: j.revenue_tier_label,
      created_at: j.created_at,
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
  console.log(`  ✅ Created ${insertedJobs?.length || 0} jobs (all AI-booked)`);

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('🎬 DEMO DATA SEEDED SUCCESSFULLY');
  console.log('='.repeat(70));
  console.log(`
📖 THE STORY: "Tuesday at 2 PM - You Were On a Roof"

You were installing a mini-split from 11 AM to 3 PM. Your phone rang 8 times.
Old world: 4 voicemails (2 hang-ups), maybe 1 callback converts.
CallLock world: All captured. 3 auto-booked. Zero lost.

📱 ACTION TAB (5 leads needing callback):

  🔴 Marcus Williams (11:47 AM)
     Emergency - AC out, baby in home, 84°F
     Revenue: $$$ ($650) - Would have called competitor

  🔵 Diana Reyes (12:23 PM)
     AC blowing warm air - standard repair
     Revenue: $$ ($325)

  🟢 Dr. Sarah Chen (1:15 PM) ← OVERLAP
     Dental office - commercial customer
     Revenue: $$$ ($550) - Recurring potential

  🟢 Tom Brennan (1:18 PM) ← OVERLAP (3 min later!)
     18-year-old system - replacement quote
     Revenue: $$$$ ($9,500) - THE BIG FISH

  ⚪ Apex HVAC Supply (2:02 PM)
     Vendor call - auto-filtered, no alert sent

📅 BOOKED TAB (3 jobs AI completed):

  Robert Kim → Tomorrow 9 AM ($ tune-up)
  Angela Morrison → Tomorrow 2 PM ($$ grinding noise)
  Dave Chen → Thursday 10 AM ($$ thermostat)

💰 THE MATH:
  - Emergency ($650) + Dental ($550) + Replacement ($9,500) + Repairs ($975)
  - Potential value: $11,675+ in ONE AFTERNOON
  - Old world: You lose the emergency, dental, AND replacement = $10,700 gone

⚡ SIMULTANEOUS CALL DEMO:
  Dr. Chen called at 1:15 PM
  Tom Brennan called at 1:18 PM
  Both handled at once - no hold, no wait

🔗 View your dashboard at: http://localhost:3000

🧹 To clear: npm run seed:clear (clears all seed data)
`);
}

async function clearDemoData(userId: string) {
  // Delete demo data by phone prefix
  const { error: leadsError } = await supabase
    .from('leads')
    .delete()
    .eq('user_id', userId)
    .like('customer_phone', `${DEMO_PHONE_PREFIX}%`);
  if (leadsError) console.error('  Error clearing leads:', leadsError.message);

  const { error: jobsError } = await supabase
    .from('jobs')
    .delete()
    .eq('user_id', userId)
    .like('customer_phone', `${DEMO_PHONE_PREFIX}%`);
  if (jobsError) console.error('  Error clearing jobs:', jobsError.message);

  const { error: customersError } = await supabase
    .from('customers')
    .delete()
    .eq('user_id', userId)
    .like('phone', `${DEMO_PHONE_PREFIX}%`);
  if (customersError) console.error('  Error clearing customers:', customersError.message);

  console.log('  ✅ Cleared existing demo data');
}

// Run
seedDemo().catch(console.error);
