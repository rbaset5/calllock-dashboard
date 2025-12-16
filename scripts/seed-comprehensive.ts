/**
 * Comprehensive Test Data Seeder (V4)
 *
 * Creates test data covering all dashboard features:
 * - All priority colors (red/green/blue/gray via priority_color)
 * - All revenue tiers ($$$$/$$$/$$/$/$$?)
 * - All lead statuses including V4: abandoned, sales_opportunity
 * - All job statuses and booking types
 * - History page badge coverage
 * - V4 Features: callback_outcome, last_call_tapped_at, time_preference
 * - Snoozed lead (remind_at)
 *
 * Usage: SEED_USER_EMAIL=your@email.com npm run seed:comprehensive
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
  console.error('Usage: SEED_USER_EMAIL=your@email.com npm run seed:comprehensive');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Phone prefix for seed data (easy cleanup)
const SEED_PHONE_PREFIX = '+15551';

// ============================================================================
// DATE HELPERS
// ============================================================================

const now = new Date();
const today = new Date(now);
today.setHours(0, 0, 0, 0);

const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);

const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);

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

function yesterdayAt(hour: number, minute = 0): Date {
  const d = new Date(yesterday);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function hoursFromNow(hours: number): Date {
  const d = new Date(now);
  d.setHours(d.getHours() + hours);
  return d;
}

// ============================================================================
// CUSTOMERS (23 total)
// ============================================================================

const CUSTOMERS = [
  // Active Leads customers (#1-11)
  { name: 'Robert Chen', phone: `${SEED_PHONE_PREFIX}000001`, email: 'robert.chen@email.com', address: '1234 Oak Street, Austin, TX 78701', equipment: [{ type: 'Central AC', brand: 'Carrier', model: '24ACC636', year: 2018, location: 'Backyard' }], notes: 'Has gate code: 1234', lifetime_value: 450, total_jobs: 2 },
  { name: 'Maria Santos', phone: `${SEED_PHONE_PREFIX}000002`, email: 'maria.santos@email.com', address: '5678 Elm Avenue, Austin, TX 78702', equipment: [{ type: 'Furnace', brand: 'Trane', model: 'XR80', year: 2015 }], notes: 'Elderly mother lives here', lifetime_value: 0, total_jobs: 0 },
  { name: 'Tony Russo', phone: `${SEED_PHONE_PREFIX}000003`, email: 'tony@russorestaurant.com', address: '900 Congress Avenue, Austin, TX 78701', equipment: [{ type: 'Walk-in Cooler', brand: 'Kolpak', year: 2019 }], notes: 'COMMERCIAL - Restaurant owner', lifetime_value: 2400, total_jobs: 4 },
  { name: 'Wei Zhang', phone: `${SEED_PHONE_PREFIX}000004`, email: 'wei.zhang@propertygroup.com', address: '2100 South Lamar Blvd, Austin, TX 78704', equipment: [{ type: 'Make-up Air Unit', brand: 'Captive-Aire', year: 2017 }], notes: 'COMMERCIAL - Property manager, 42 units', lifetime_value: 8500, total_jobs: 12 },
  { name: 'Jessica Palmer', phone: `${SEED_PHONE_PREFIX}000005`, email: 'jpalmer@gmail.com', address: '456 Riverside Drive, Austin, TX 78741', equipment: [{ type: 'Heat Pump', brand: 'Lennox', year: 2023 }], notes: null, lifetime_value: 0, total_jobs: 0 },
  { name: 'Kevin Park', phone: `${SEED_PHONE_PREFIX}000006`, email: 'kevin.park@outlook.com', address: '789 Barton Springs Road, Austin, TX 78704', equipment: [{ type: 'Smart Thermostat', brand: 'Ecobee', year: 2024 }], notes: null, lifetime_value: 150, total_jobs: 1 },
  { name: 'David Nguyen', phone: `${SEED_PHONE_PREFIX}000007`, email: 'dnguyen@yahoo.com', address: '321 East 6th Street, Austin, TX 78701', equipment: [{ type: 'Central AC', brand: 'Goodman', year: 2020 }], notes: 'Condensate drain clogged before', lifetime_value: 200, total_jobs: 1 },
  { name: 'Spam Vendor', phone: `${SEED_PHONE_PREFIX}000008`, email: null, address: '', equipment: [], notes: 'SPAM - HVAC parts vendor', lifetime_value: 0, total_jobs: 0 },
  { name: 'Wrong Number', phone: `${SEED_PHONE_PREFIX}000009`, email: null, address: '', equipment: [], notes: 'Wrong number', lifetime_value: 0, total_jobs: 0 },
  { name: 'Mike Ross', phone: `${SEED_PHONE_PREFIX}000010`, email: 'mike.ross@email.com', address: '555 Manor Road, Austin, TX 78723', equipment: [{ type: 'Window AC', brand: 'LG', year: 2022 }], notes: null, lifetime_value: 0, total_jobs: 0 },
  { name: 'Lisa Chen', phone: `${SEED_PHONE_PREFIX}000011`, email: 'lisa.chen@email.com', address: '888 North Loop Blvd, Austin, TX 78751', equipment: [{ type: 'Mini-split', brand: 'Mitsubishi', year: 2021 }], notes: null, lifetime_value: 150, total_jobs: 1 },
  // Historical leads customers (#12-14)
  { name: 'Sarah Wilson', phone: `${SEED_PHONE_PREFIX}000012`, email: 'sarah.wilson@email.com', address: '222 West 5th Street, Austin, TX 78701', equipment: [{ type: 'Central AC', brand: 'Rheem', year: 2019 }], notes: null, lifetime_value: 350, total_jobs: 1 },
  { name: 'James Brown', phone: `${SEED_PHONE_PREFIX}000013`, email: 'jbrown@email.com', address: '333 East Cesar Chavez, Austin, TX 78702', equipment: [], notes: 'ARCHIVED - decided to DIY', lifetime_value: 0, total_jobs: 0 },
  { name: 'Telemarketer', phone: `${SEED_PHONE_PREFIX}000014`, email: null, address: '', equipment: [], notes: 'SPAM', lifetime_value: 0, total_jobs: 0 },
  // Jobs customers (#15-23)
  { name: 'Carol Martinez', phone: `${SEED_PHONE_PREFIX}000015`, email: 'carol.martinez@vip.com', address: '100 VIP Boulevard, Austin, TX 78701', equipment: [{ type: 'Full HVAC System', brand: 'Trane', year: 2020 }], notes: 'VIP CUSTOMER', lifetime_value: 12000, total_jobs: 15 },
  { name: 'Patricia Nelson', phone: `${SEED_PHONE_PREFIX}000016`, email: 'pnelson@email.com', address: '200 Blower Motor Lane, Austin, TX 78702', equipment: [{ type: 'Central AC', brand: 'Carrier', year: 2018 }], notes: null, lifetime_value: 0, total_jobs: 0 },
  { name: 'Linda Cooper', phone: `${SEED_PHONE_PREFIX}000017`, email: 'lcooper@email.com', address: '300 Compressor Court, Austin, TX 78703', equipment: [{ type: 'Central AC', brand: 'Lennox', year: 2016 }], notes: 'Compressor replacement candidate', lifetime_value: 0, total_jobs: 0 },
  { name: 'Harold Mitchell', phone: `${SEED_PHONE_PREFIX}000018`, email: 'hmitchell@email.com', address: '400 R22 Road, Austin, TX 78704', equipment: [{ type: 'Central AC', brand: 'Bryant', year: 2008 }], notes: 'R-22 system', lifetime_value: 0, total_jobs: 0 },
  { name: 'Brandon Hayes', phone: `${SEED_PHONE_PREFIX}000019`, email: 'bhayes@email.com', address: '500 En Route Avenue, Austin, TX 78705', equipment: [{ type: 'Heat Pump', brand: 'Goodman', year: 2020 }], notes: null, lifetime_value: 0, total_jobs: 0 },
  { name: 'Michael Thompson', phone: `${SEED_PHONE_PREFIX}000020`, email: 'mthompson@email.com', address: '600 On Site Street, Austin, TX 78751', equipment: [{ type: 'Heat Pump', brand: 'Carrier', year: 2019 }], notes: null, lifetime_value: 0, total_jobs: 0 },
  { name: 'Jennifer Adams', phone: `${SEED_PHONE_PREFIX}000021`, email: 'jadams@email.com', address: '700 Complete Circle, Austin, TX 78752', equipment: [{ type: 'Central AC', brand: 'Trane', year: 2021 }], notes: null, lifetime_value: 800, total_jobs: 2 },
  { name: 'Amanda Foster', phone: `${SEED_PHONE_PREFIX}000022`, email: 'afoster@email.com', address: '800 Manual Way, Austin, TX 78753', equipment: [{ type: 'Heat Pump', brand: 'Rheem', year: 2022 }], notes: null, lifetime_value: 300, total_jobs: 1 },
  { name: 'Cancelled Person', phone: `${SEED_PHONE_PREFIX}000023`, email: 'cancelled@email.com', address: '900 Cancelled Court, Austin, TX 78754', equipment: [], notes: 'Cancelled', lifetime_value: 0, total_jobs: 0 },
];

// ============================================================================
// ACTIVE LEADS (11 total - for ACTION page)
// Uses V4 schema columns: priority_color, priority_reason, callback_outcome, etc.
// ============================================================================

const ACTIVE_LEADS = [
  // #1 - RED: Robert Chen - Callback Risk
  {
    customer_name: 'Robert Chen',
    customer_phone: `${SEED_PHONE_PREFIX}000001`,
    customer_address: '1234 Oak Street, Austin, TX 78701',
    status: 'callback_requested',
    priority: 'hot',
    // V4 priority system
    priority_color: 'red',
    priority_reason: 'Repeat issue within 30 days - high callback risk',
    why_not_booked: 'Customer wants to speak with technician who came last time',
    issue_description: 'AC stopped cooling again, same problem as last week',
    service_type: 'hvac',
    urgency: 'high',
    estimated_value: 350,
    ai_summary: '[RED - Callback Risk] Repeat issue within 30 days. Customer called about AC not cooling. This is a repeat call - same issue last week. Requested same technician (Mike). Warranty should cover.',
    revenue_tier: 'diagnostic',
    revenue_tier_label: '$$?',
    revenue_tier_description: 'Diagnostic needed - repeat issue',
    revenue_tier_signals: ['repeat_customer', 'warranty_mention'],
    revenue_confidence: 'medium',
    remind_at: null,
    problem_duration: '1 week (recurring)',
    problem_pattern: 'Intermittent - works in morning, stops in afternoon',
    // V4 features
    time_preference: 'Tomorrow morning',
    callback_outcome: null,
    callback_outcome_at: null,
    callback_outcome_note: null,
    last_call_tapped_at: null,
  },
  // #2 - RED: Maria Santos - Customer frustrated (abandoned status)
  {
    customer_name: 'Maria Santos',
    customer_phone: `${SEED_PHONE_PREFIX}000002`,
    customer_address: '5678 Elm Avenue, Austin, TX 78702',
    status: 'abandoned',  // V4: customer hung up / high callback risk
    priority: 'hot',
    // V4 priority system
    priority_color: 'red',
    priority_reason: 'Customer demanded manager - high callback risk',
    why_not_booked: 'Customer wants manager callback before booking',
    issue_description: 'Furnace making loud banging noise, elderly mother scared',
    service_type: 'hvac',
    urgency: 'emergency',
    estimated_value: 400,
    ai_summary: '[RED - Frustrated Customer] Demanded manager. Elderly mother frightened by loud banging from furnace. Another company never showed up. Wants to speak with owner/manager before scheduling.',
    revenue_tier: 'standard_repair',
    revenue_tier_label: '$$',
    revenue_tier_description: 'Likely igniter or heat exchanger',
    revenue_tier_signals: ['banging_noise', 'furnace', 'urgent'],
    revenue_confidence: 'medium',
    remind_at: null,
    problem_duration: '2 days',
    problem_pattern: 'Every time it turns on',
    // V4 features
    time_preference: 'ASAP',
    callback_outcome: null,
    callback_outcome_at: null,
    callback_outcome_note: null,
    last_call_tapped_at: null,
  },
  // #3 - GREEN: Tony Russo - Commercial high-value (sales_opportunity status)
  {
    customer_name: 'Tony Russo',
    customer_phone: `${SEED_PHONE_PREFIX}000003`,
    customer_address: '900 Congress Avenue, Austin, TX 78701',
    status: 'sales_opportunity',  // V4: high-value commercial lead
    priority: 'hot',
    // V4 priority system
    priority_color: 'green',
    priority_reason: 'Commercial customer - PM contract potential ($$$)',
    why_not_booked: 'Needs quote for preventive maintenance contract',
    issue_description: 'Walk-in cooler running warm, restaurant busy this weekend',
    service_type: 'hvac',
    urgency: 'high',
    estimated_value: 2500,
    ai_summary: '[GREEN - Commercial] Restaurant owner. Walk-in cooler not holding temp, food at risk. Interested in PM contract. Has 2 other locations.',
    revenue_tier: 'replacement',
    revenue_tier_label: '$$$$',
    revenue_tier_description: 'Commercial equipment + PM contract potential',
    revenue_tier_signals: ['commercial', 'restaurant', 'pm_contract_interest'],
    revenue_confidence: 'high',
    remind_at: null,
    problem_duration: 'Since this morning',
    problem_pattern: 'Not cycling properly',
    // V4 features
    time_preference: 'This week',
    callback_outcome: null,
    callback_outcome_at: null,
    callback_outcome_note: null,
    last_call_tapped_at: null,
  },
  // #4 - GREEN: Wei Zhang - High LTV property manager
  {
    customer_name: 'Wei Zhang',
    customer_phone: `${SEED_PHONE_PREFIX}000004`,
    customer_address: '2100 South Lamar Blvd, Austin, TX 78704',
    status: 'sales_opportunity',  // V4: high-value property manager
    priority: 'hot',
    // V4 priority system
    priority_color: 'green',
    priority_reason: 'High LTV customer ($8,500) - property manager with 42 units',
    why_not_booked: 'Needs to coordinate with building maintenance',
    issue_description: 'Multiple units reporting AC issues, make-up air unit needs service',
    service_type: 'hvac',
    urgency: 'medium',
    estimated_value: 1500,
    ai_summary: '[GREEN - High LTV] Property manager, 42-unit complex. Multiple AC complaints. $8,500 lifetime value.',
    revenue_tier: 'major_repair',
    revenue_tier_label: '$$$',
    revenue_tier_description: 'Multi-unit service potential',
    revenue_tier_signals: ['property_manager', 'multiple_units', 'high_ltv'],
    revenue_confidence: 'high',
    remind_at: null,
    problem_duration: '1 week',
    problem_pattern: 'Multiple units affected',
    // V4 features
    time_preference: 'After 5pm',
    callback_outcome: null,
    callback_outcome_at: null,
    callback_outcome_note: null,
    last_call_tapped_at: null,
  },
  // #5 - BLUE: Jessica Palmer - Standard lead
  {
    customer_name: 'Jessica Palmer',
    customer_phone: `${SEED_PHONE_PREFIX}000005`,
    customer_address: '456 Riverside Drive, Austin, TX 78741',
    status: 'callback_requested',
    priority: 'warm',
    // V4 priority system
    priority_color: 'blue',
    priority_reason: 'Standard residential lead',
    why_not_booked: 'Wanted to check with spouse first',
    issue_description: 'Heat pump not switching modes properly',
    service_type: 'hvac',
    urgency: 'medium',
    estimated_value: 300,
    ai_summary: 'Heat pump won\'t switch from cooling to heating. Unit 1 year old (under warranty). Needs to discuss with husband. Will call back.',
    revenue_tier: 'standard_repair',
    revenue_tier_label: '$$',
    revenue_tier_description: 'Heat pump service',
    revenue_tier_signals: ['heat_pump', 'mode_switching', 'warranty'],
    revenue_confidence: 'medium',
    remind_at: null,
    problem_duration: '3 days',
    problem_pattern: null,
    // V4 features
    time_preference: null,
    callback_outcome: null,
    callback_outcome_at: null,
    callback_outcome_note: null,
    last_call_tapped_at: null,
  },
  // #6 - BLUE: Kevin Park - Thinking it over (with callback outcome - try_again)
  {
    customer_name: 'Kevin Park',
    customer_phone: `${SEED_PHONE_PREFIX}000006`,
    customer_address: '789 Barton Springs Road, Austin, TX 78704',
    status: 'thinking',
    priority: 'cold',
    // V4 priority system
    priority_color: 'blue',
    priority_reason: 'Standard residential - price shopping',
    why_not_booked: 'Price shopping - wants to compare quotes',
    issue_description: 'Smart thermostat not connecting to WiFi',
    service_type: 'hvac',
    urgency: 'low',
    estimated_value: 150,
    ai_summary: 'Ecobee losing WiFi connection. Not urgent - works manually. Getting other quotes. May try YouTube first.',
    revenue_tier: 'minor',
    revenue_tier_label: '$',
    revenue_tier_description: 'Smart thermostat troubleshooting',
    revenue_tier_signals: ['smart_thermostat', 'wifi_issue'],
    revenue_confidence: 'high',
    remind_at: null,
    problem_duration: '1 week',
    problem_pattern: 'Intermittent disconnects',
    // V4 features - has previous callback outcome
    time_preference: 'Weekend',
    callback_outcome: 'try_again',
    callback_outcome_at: hoursFromNow(-24).toISOString(),
    callback_outcome_note: 'Customer asked to call back after getting other quotes',
    last_call_tapped_at: hoursFromNow(-24).toISOString(),
  },
  // #7 - BLUE: David Nguyen - Left voicemail (with last_call_tapped_at for outcome prompt test)
  {
    customer_name: 'David Nguyen',
    customer_phone: `${SEED_PHONE_PREFIX}000007`,
    customer_address: '321 East 6th Street, Austin, TX 78701',
    status: 'voicemail_left',
    priority: 'warm',
    // V4 priority system
    priority_color: 'blue',
    priority_reason: 'Standard residential - follow up needed',
    why_not_booked: 'Customer did not answer - left voicemail',
    issue_description: 'AC unit leaking water inside home',
    service_type: 'hvac',
    urgency: 'medium',
    estimated_value: 250,
    ai_summary: 'Water leaking from indoor AC unit. Likely clogged condensate drain. Called back - reached voicemail. Left message.',
    revenue_tier: 'diagnostic',
    revenue_tier_label: '$$?',
    revenue_tier_description: 'Could be drain or evaporator',
    revenue_tier_signals: ['water_leak', 'indoor_unit'],
    revenue_confidence: 'low',
    remind_at: null,
    problem_duration: 'Started today',
    problem_pattern: null,
    // V4 features - recent call tap for outcome prompt test
    time_preference: null,
    callback_outcome: null,
    callback_outcome_at: null,
    callback_outcome_note: null,
    last_call_tapped_at: hoursFromNow(-0.5).toISOString(),  // 30 min ago - should trigger outcome prompt
  },
  // #8 - GRAY: Spam Vendor
  {
    customer_name: 'Spam Vendor',
    customer_phone: `${SEED_PHONE_PREFIX}000008`,
    customer_address: null,
    status: 'info_only',
    priority: 'cold',
    // V4 priority system
    priority_color: 'gray',
    priority_reason: 'Spam - vendor sales call',
    why_not_booked: 'Not a customer - vendor sales call',
    issue_description: 'Vendor calling to sell HVAC parts',
    service_type: 'hvac',
    urgency: 'low',
    estimated_value: null,
    ai_summary: '[GRAY - Spam] Sales call from HVAC parts distributor. Not a service request.',
    revenue_tier: null,
    revenue_tier_label: null,
    revenue_tier_description: null,
    revenue_tier_signals: null,
    revenue_confidence: null,
    remind_at: null,
    problem_duration: null,
    problem_pattern: null,
    // V4 features
    time_preference: null,
    callback_outcome: null,
    callback_outcome_at: null,
    callback_outcome_note: null,
    last_call_tapped_at: null,
  },
  // #9 - GRAY: Wrong Number (abandoned status)
  {
    customer_name: 'Wrong Number',
    customer_phone: `${SEED_PHONE_PREFIX}000009`,
    customer_address: null,
    status: 'abandoned',  // V4: caller hung up
    priority: 'cold',
    // V4 priority system
    priority_color: 'gray',
    priority_reason: 'Wrong number - no service needed',
    why_not_booked: 'Wrong number - looking for pizza delivery',
    issue_description: 'Caller had wrong number',
    service_type: 'general',
    urgency: 'low',
    estimated_value: null,
    ai_summary: '[GRAY - Wrong Number] Caller trying to reach pizza place. Hung up.',
    revenue_tier: null,
    revenue_tier_label: null,
    revenue_tier_description: null,
    revenue_tier_signals: null,
    revenue_confidence: null,
    remind_at: null,
    problem_duration: null,
    problem_pattern: null,
    // V4 features
    time_preference: null,
    callback_outcome: null,
    callback_outcome_at: null,
    callback_outcome_note: null,
    last_call_tapped_at: null,
  },
  // #10 - BLUE: Mike Ross - Standard lead (with resolved callback outcome)
  {
    customer_name: 'Mike Ross',
    customer_phone: `${SEED_PHONE_PREFIX}000010`,
    customer_address: '555 Manor Road, Austin, TX 78723',
    status: 'callback_requested',
    priority: 'warm',
    // V4 priority system
    priority_color: 'blue',
    priority_reason: 'Standard residential lead',
    why_not_booked: 'Needed to check work schedule',
    issue_description: 'Window AC unit not blowing cold air',
    service_type: 'hvac',
    urgency: 'medium',
    estimated_value: 200,
    ai_summary: 'Window AC not cooling. Unit 2 years old. Works from home, needs it fixed. Checking calendar.',
    revenue_tier: 'standard_repair',
    revenue_tier_label: '$$',
    revenue_tier_description: 'Window AC service',
    revenue_tier_signals: ['window_ac', 'not_cooling'],
    revenue_confidence: 'high',
    remind_at: null,
    problem_duration: '2 days',
    problem_pattern: null,
    // V4 features
    time_preference: null,
    callback_outcome: null,
    callback_outcome_at: null,
    callback_outcome_note: null,
    last_call_tapped_at: null,
  },
  // #11 - BLUE: Lisa Chen - SNOOZED (remind_at set) with no_answer callback outcome
  {
    customer_name: 'Lisa Chen',
    customer_phone: `${SEED_PHONE_PREFIX}000011`,
    customer_address: '888 North Loop Blvd, Austin, TX 78751',
    status: 'deferred',  // Snoozed status
    priority: 'warm',
    // V4 priority system
    priority_color: 'blue',
    priority_reason: 'Standard residential - snoozed for follow-up',
    why_not_booked: 'No answer on first callback attempt',
    issue_description: 'Mini-split making clicking noise',
    service_type: 'hvac',
    urgency: 'low',
    estimated_value: 175,
    ai_summary: '[SNOOZED - Try Again] Clicking noise from mini-split. Not urgent - still cooling. Called back, no answer. Will try again in 2 hours.',
    revenue_tier: 'minor',
    revenue_tier_label: '$',
    revenue_tier_description: 'Fan motor or relay issue',
    revenue_tier_signals: ['mini_split', 'clicking_noise'],
    revenue_confidence: 'medium',
    // KEY: Snoozed lead
    remind_at: hoursFromNow(2).toISOString(),
    problem_duration: '3 days',
    problem_pattern: 'When unit starts',
    // V4 features - previous callback outcome was no_answer
    time_preference: null,
    callback_outcome: 'no_answer',
    callback_outcome_at: hoursFromNow(-1).toISOString(),
    callback_outcome_note: 'No answer - snoozed for 2 hours',
    last_call_tapped_at: hoursFromNow(-1).toISOString(),
  },
];

// ============================================================================
// HISTORICAL LEADS (4 total - for HISTORY page badges)
// Uses V4 columns for consistency
// ============================================================================

const HISTORICAL_LEADS = [
  // For RESOLVED badge (callback_outcome = 'resolved')
  {
    customer_name: 'Resolved Lead',
    customer_phone: `${SEED_PHONE_PREFIX}000024`,
    customer_address: '111 Resolved Road, Austin, TX 78701',
    status: 'converted',
    priority: 'warm',
    // V4 priority system
    priority_color: 'blue',
    priority_reason: 'Resolved over phone - no service needed',
    why_not_booked: null,
    issue_description: 'AC filter question - resolved over phone',
    service_type: 'hvac',
    urgency: 'low',
    estimated_value: 0,
    ai_summary: 'Customer called about AC filter. Walked through process over phone. Issue resolved - no service visit needed.',
    revenue_tier: null,
    revenue_tier_label: null,
    revenue_tier_description: null,
    revenue_tier_signals: null,
    revenue_confidence: null,
    remind_at: null,
    problem_duration: null,
    problem_pattern: null,
    // V4 features - resolved outcome
    time_preference: null,
    callback_outcome: 'resolved',
    callback_outcome_at: yesterdayAt(10).toISOString(),
    callback_outcome_note: 'Walked customer through filter replacement process',
    last_call_tapped_at: yesterdayAt(10).toISOString(),
  },
  // For ARCHIVED badge (lost status)
  {
    customer_name: 'James Brown',
    customer_phone: `${SEED_PHONE_PREFIX}000013`,
    customer_address: '333 East Cesar Chavez, Austin, TX 78702',
    status: 'lost',
    priority: 'cold',
    // V4 priority system
    priority_color: 'blue',
    priority_reason: 'Lost - customer chose DIY',
    why_not_booked: 'Customer decided to DIY',
    issue_description: 'Thermostat battery replacement',
    service_type: 'hvac',
    urgency: 'low',
    estimated_value: 0,
    ai_summary: 'Thermostat not working. Explained might need new batteries. Customer trying DIY first.',
    revenue_tier: 'minor',
    revenue_tier_label: '$',
    revenue_tier_description: null,
    revenue_tier_signals: null,
    revenue_confidence: null,
    remind_at: null,
    problem_duration: null,
    problem_pattern: null,
    // V4 features
    time_preference: null,
    callback_outcome: 'resolved',
    callback_outcome_at: yesterdayAt(14).toISOString(),
    callback_outcome_note: 'Customer decided to try DIY first',
    last_call_tapped_at: yesterdayAt(14).toISOString(),
  },
  // For SPAM badge
  {
    customer_name: 'Telemarketer',
    customer_phone: `${SEED_PHONE_PREFIX}000014`,
    customer_address: null,
    status: 'lost',
    priority: 'cold',
    // V4 priority system
    priority_color: 'gray',
    priority_reason: 'Spam - telemarketer',
    why_not_booked: 'SPAM - Extended warranty scam',
    issue_description: 'Extended warranty sales call',
    service_type: 'general',
    urgency: 'low',
    estimated_value: null,
    ai_summary: '[SPAM] Telemarketer - extended warranty scam.',
    revenue_tier: null,
    revenue_tier_label: null,
    revenue_tier_description: null,
    revenue_tier_signals: null,
    revenue_confidence: null,
    remind_at: null,
    problem_duration: null,
    problem_pattern: null,
    // V4 features
    time_preference: null,
    callback_outcome: null,
    callback_outcome_at: null,
    callback_outcome_note: null,
    last_call_tapped_at: null,
  },
  // Sarah Wilson - converted with booked outcome (linked to completed job)
  {
    customer_name: 'Sarah Wilson',
    customer_phone: `${SEED_PHONE_PREFIX}000012`,
    customer_address: '222 West 5th Street, Austin, TX 78701',
    status: 'converted',
    priority: 'hot',
    // V4 priority system
    priority_color: 'blue',
    priority_reason: 'Converted to job',
    why_not_booked: null,
    issue_description: 'AC not cooling - scheduled appointment',
    service_type: 'hvac',
    urgency: 'medium',
    estimated_value: 350,
    ai_summary: 'AC not cooling. AI scheduled appointment yesterday. Capacitor replaced on site.',
    revenue_tier: 'standard_repair',
    revenue_tier_label: '$$',
    revenue_tier_description: null,
    revenue_tier_signals: null,
    revenue_confidence: null,
    remind_at: null,
    problem_duration: '1 day',
    problem_pattern: null,
    // V4 features - booked outcome
    time_preference: 'This afternoon',
    callback_outcome: 'booked',
    callback_outcome_at: yesterdayAt(9).toISOString(),
    callback_outcome_note: 'Scheduled for same day service',
    last_call_tapped_at: yesterdayAt(9).toISOString(),
  },
];

// ============================================================================
// JOBS (9 total - for BOOKED page, all statuses)
// ============================================================================

const JOBS = [
  // #1 - Today 9am - new, AI booked
  { customer_name: 'Carol Martinez', customer_phone: `${SEED_PHONE_PREFIX}000015`, customer_address: '100 VIP Boulevard, Austin, TX 78701', service_type: 'hvac', urgency: 'medium', status: 'new', scheduled_at: todayAt(9), completed_at: null, estimated_value: 150, revenue: null, ai_summary: 'VIP customer - routine maintenance.', is_ai_booked: true, booking_confirmed: true, revenue_tier: 'minor', revenue_tier_label: '$' },
  // #2 - Today 2pm - new, manually booked
  { customer_name: 'Patricia Nelson', customer_phone: `${SEED_PHONE_PREFIX}000016`, customer_address: '200 Blower Motor Lane, Austin, TX 78702', service_type: 'hvac', urgency: 'medium', status: 'new', scheduled_at: todayAt(14), completed_at: null, estimated_value: 450, revenue: null, ai_summary: 'Blower motor grinding noise.', is_ai_booked: false, booking_confirmed: true, revenue_tier: 'major_repair', revenue_tier_label: '$$$' },
  // #3 - Tomorrow 8am - confirmed, AI booked
  { customer_name: 'Linda Cooper', customer_phone: `${SEED_PHONE_PREFIX}000017`, customer_address: '300 Compressor Court, Austin, TX 78703', service_type: 'hvac', urgency: 'high', status: 'confirmed', scheduled_at: tomorrowAt(8), completed_at: null, estimated_value: 3500, revenue: null, ai_summary: 'Compressor replacement quote.', is_ai_booked: true, booking_confirmed: true, revenue_tier: 'replacement', revenue_tier_label: '$$$$' },
  // #4 - Tomorrow 10am - confirmed, manually booked
  { customer_name: 'Harold Mitchell', customer_phone: `${SEED_PHONE_PREFIX}000018`, customer_address: '400 R22 Road, Austin, TX 78704', service_type: 'hvac', urgency: 'medium', status: 'confirmed', scheduled_at: tomorrowAt(10), completed_at: null, estimated_value: 500, revenue: null, ai_summary: 'R-22 system low on refrigerant.', is_ai_booked: false, booking_confirmed: true, revenue_tier: 'major_repair', revenue_tier_label: '$$$' },
  // #5 - Today 11am - en_route, AI booked
  { customer_name: 'Brandon Hayes', customer_phone: `${SEED_PHONE_PREFIX}000019`, customer_address: '500 En Route Avenue, Austin, TX 78705', service_type: 'hvac', urgency: 'high', status: 'en_route', scheduled_at: todayAt(11), completed_at: null, estimated_value: 300, revenue: null, ai_summary: 'Heat pump not heating. Infant at home.', is_ai_booked: true, booking_confirmed: true, revenue_tier: 'standard_repair', revenue_tier_label: '$$', travel_started_at: todayAt(10, 45) },
  // #6 - Today (now) - on_site, manually booked
  { customer_name: 'Michael Thompson', customer_phone: `${SEED_PHONE_PREFIX}000020`, customer_address: '600 On Site Street, Austin, TX 78751', service_type: 'hvac', urgency: 'medium', status: 'on_site', scheduled_at: todayAt(10), completed_at: null, estimated_value: 400, revenue: null, ai_summary: 'Heat pump conversion consultation.', is_ai_booked: false, booking_confirmed: true, revenue_tier: 'standard_repair', revenue_tier_label: '$$', travel_started_at: todayAt(9, 30), started_at: todayAt(10, 5) },
  // #7 - Yesterday - complete, AI booked (for AI BOOKED badge)
  { customer_name: 'Jennifer Adams', customer_phone: `${SEED_PHONE_PREFIX}000021`, customer_address: '700 Complete Circle, Austin, TX 78752', service_type: 'hvac', urgency: 'medium', status: 'complete', scheduled_at: yesterdayAt(14), completed_at: yesterdayAt(15, 30), estimated_value: 350, revenue: 375, ai_summary: 'Capacitor replacement. Completed.', is_ai_booked: true, booking_confirmed: true, revenue_tier: 'major_repair', revenue_tier_label: '$$$' },
  // #8 - Yesterday - complete, manually booked (for YOU BOOKED badge)
  { customer_name: 'Amanda Foster', customer_phone: `${SEED_PHONE_PREFIX}000022`, customer_address: '800 Manual Way, Austin, TX 78753', service_type: 'hvac', urgency: 'low', status: 'complete', scheduled_at: yesterdayAt(16), completed_at: yesterdayAt(17), estimated_value: 125, revenue: 125, ai_summary: 'Tune-up and filter replacement.', is_ai_booked: false, booking_confirmed: true, revenue_tier: 'minor', revenue_tier_label: '$' },
  // #9 - Yesterday - cancelled, AI booked
  { customer_name: 'Cancelled Person', customer_phone: `${SEED_PHONE_PREFIX}000023`, customer_address: '900 Cancelled Court, Austin, TX 78754', service_type: 'hvac', urgency: 'low', status: 'cancelled', scheduled_at: yesterdayAt(12), completed_at: null, estimated_value: 200, revenue: null, ai_summary: 'Cancelled - issue self-resolved.', is_ai_booked: true, booking_confirmed: false, revenue_tier: 'standard_repair', revenue_tier_label: '$$', cancelled_at: yesterdayAt(11) },
];

// ============================================================================
// SEED FUNCTION
// ============================================================================

async function seed() {
  console.log(`\n🌱 Seeding COMPREHENSIVE test data for user: ${seedUserEmail}\n`);
  console.log('📊 Coverage: All status colors, revenue tiers, statuses, and features\n');

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

  // 2. Clear existing seed data
  console.log('\n🧹 Clearing existing seed data...');
  await clearSeedData(userId);

  // 3. Insert customers
  console.log('\n👥 Creating customers (23 total)...');
  const customersToInsert = CUSTOMERS.map(c => ({
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

  // 4. Insert active leads (for ACTION page)
  console.log('\n📞 Creating active leads (11 total - for ACTION page)...');
  const activeLeadsToInsert = ACTIVE_LEADS.map(l => ({
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
    revenue_tier: l.revenue_tier,
    revenue_tier_label: l.revenue_tier_label,
    revenue_tier_description: l.revenue_tier_description,
    revenue_tier_signals: l.revenue_tier_signals,
    revenue_confidence: l.revenue_confidence,
    remind_at: l.remind_at,
    problem_duration: l.problem_duration,
    problem_pattern: l.problem_pattern,
    // V4 outcome tracking
    time_preference: l.time_preference,
    callback_outcome: l.callback_outcome,
    callback_outcome_at: l.callback_outcome_at,
    callback_outcome_note: l.callback_outcome_note,
    last_call_tapped_at: l.last_call_tapped_at,
  }));

  const { data: insertedActiveLeads, error: activeLeadsError } = await supabase
    .from('leads')
    .insert(activeLeadsToInsert)
    .select();

  if (activeLeadsError) {
    console.error('Error inserting active leads:', activeLeadsError);
    process.exit(1);
  }
  console.log(`  ✅ Created ${insertedActiveLeads?.length || 0} active leads`);

  // Log priority color distribution (V4)
  const colorCounts = {
    red: insertedActiveLeads?.filter(l => l.priority_color === 'red').length || 0,
    green: insertedActiveLeads?.filter(l => l.priority_color === 'green').length || 0,
    blue: insertedActiveLeads?.filter(l => l.priority_color === 'blue').length || 0,
    gray: insertedActiveLeads?.filter(l => l.priority_color === 'gray').length || 0,
  };
  console.log(`     Priority colors (V4): RED (${colorCounts.red}), GREEN (${colorCounts.green}), BLUE (${colorCounts.blue}), GRAY (${colorCounts.gray})`);

  // 5. Insert historical leads (for HISTORY page)
  console.log('\n📜 Creating historical leads (4 total - for HISTORY page)...');

  // Add resolved lead customer first
  const { error: resolvedCustomerError } = await supabase
    .from('customers')
    .insert({
      user_id: userId,
      name: 'Resolved Lead',
      phone: `${SEED_PHONE_PREFIX}000024`,
      email: 'resolved@email.com',
      address: '111 Resolved Road, Austin, TX 78701',
      equipment: [],
      lifetime_value: 0,
      total_jobs: 0,
    });
  if (resolvedCustomerError) console.log('  Note: Resolved customer may already exist');

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
    revenue_tier: l.revenue_tier,
    revenue_tier_label: l.revenue_tier_label,
    revenue_tier_description: l.revenue_tier_description,
    revenue_tier_signals: l.revenue_tier_signals,
    revenue_confidence: l.revenue_confidence,
    remind_at: l.remind_at,
    problem_duration: l.problem_duration,
    problem_pattern: l.problem_pattern,
    // V4 outcome tracking
    time_preference: l.time_preference,
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

  // 6. Insert jobs (for BOOKED page)
  console.log('\n📋 Creating jobs (9 total - for BOOKED page)...');
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
      cancelled_at: j.cancelled_at?.toISOString() || null,
      estimated_value: j.estimated_value,
      revenue: j.revenue,
      ai_summary: j.ai_summary,
      is_ai_booked: j.is_ai_booked,
      booking_confirmed: j.booking_confirmed,
      revenue_tier: j.revenue_tier,
      revenue_tier_label: j.revenue_tier_label,
      travel_started_at: j.travel_started_at?.toISOString() || null,
      started_at: j.started_at?.toISOString() || null,
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

  // Log job status distribution
  const statusCounts = {
    new: insertedJobs?.filter(j => j.status === 'new').length || 0,
    confirmed: insertedJobs?.filter(j => j.status === 'confirmed').length || 0,
    en_route: insertedJobs?.filter(j => j.status === 'en_route').length || 0,
    on_site: insertedJobs?.filter(j => j.status === 'on_site').length || 0,
    complete: insertedJobs?.filter(j => j.status === 'complete').length || 0,
    cancelled: insertedJobs?.filter(j => j.status === 'cancelled').length || 0,
  };
  console.log(`     Statuses: new (${statusCounts.new}), confirmed (${statusCounts.confirmed}), en_route (${statusCounts.en_route}), on_site (${statusCounts.on_site}), complete (${statusCounts.complete}), cancelled (${statusCounts.cancelled})`);

  const aiBookedCount = insertedJobs?.filter(j => j.is_ai_booked).length || 0;
  console.log(`     AI Booked: ${aiBookedCount}, Manual: ${(insertedJobs?.length || 0) - aiBookedCount}`);

  // 7. Create AI booking reviews for unconfirmed AI-booked jobs
  console.log('\n🤖 Creating AI booking reviews...');
  const jobsNeedingReview = (insertedJobs || [])
    .filter(j => j.is_ai_booked && !j.booking_confirmed && j.status !== 'cancelled')
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
  console.log('\n' + '='.repeat(70));
  console.log('🎉 COMPREHENSIVE test data seeded successfully!');
  console.log('='.repeat(70));
  console.log(`
📊 Data Summary:
   • Customers: ${(insertedCustomers?.length || 0) + 1}
   • Active Leads: ${insertedActiveLeads?.length || 0} (ACTION page)
   • Historical Leads: ${insertedHistoricalLeads?.length || 0} (HISTORY page)
   • Jobs: ${insertedJobs?.length || 0} (BOOKED page)

🎨 V4 Priority Colors (via priority_color column):
   • RED (Callback Risk): ${colorCounts.red}
   • GREEN (Commercial/High-value): ${colorCounts.green}
   • BLUE (Standard): ${colorCounts.blue}
   • GRAY (Spam/Vendor): ${colorCounts.gray}

💰 Revenue Tiers:
   • $$$$ (Replacement): ${insertedActiveLeads?.filter(l => l.revenue_tier_label === '$$$$').length || 0}
   • $$$ (Major Repair): ${insertedActiveLeads?.filter(l => l.revenue_tier_label === '$$$').length || 0}
   • $$ (Standard Repair): ${insertedActiveLeads?.filter(l => l.revenue_tier_label === '$$').length || 0}
   • $ (Minor): ${insertedActiveLeads?.filter(l => l.revenue_tier_label === '$').length || 0}
   • $$? (Diagnostic): ${insertedActiveLeads?.filter(l => l.revenue_tier_label === '$$?').length || 0}

🧪 V4 Special Test Cases:
   • Snoozed Lead: Lisa Chen (remind_at set to 2 hours from now, callback_outcome='no_answer')
   • RED leads: Robert Chen (repeat issue), Maria Santos (abandoned/frustrated)
   • GREEN leads: Tony Russo (sales_opportunity), Wei Zhang (sales_opportunity/high LTV)
   • GRAY leads: Spam Vendor, Wrong Number (abandoned)
   • Outcome Prompt Test: David Nguyen (last_call_tapped_at 30 min ago)
   • Try Again: Kevin Park (callback_outcome='try_again')
   • Booked: Sarah Wilson (callback_outcome='booked')
   • Resolved: Resolved Lead (callback_outcome='resolved')

📱 Verification:
   • ACTION page: ${insertedActiveLeads?.length || 0} leads
   • BOOKED page: ${statusCounts.new + statusCounts.confirmed + statusCounts.en_route + statusCounts.on_site} active jobs
   • HISTORY page: ${statusCounts.complete + statusCounts.cancelled} jobs + ${insertedHistoricalLeads?.length || 0} leads

🔗 View your dashboard at: http://localhost:3000

🧹 To clear seed data: npm run seed:clear
`);
}

async function clearSeedData(userId: string) {
  // Delete in reverse order of dependencies

  // AI booking reviews
  const { error: reviewsError } = await supabase
    .from('ai_booking_reviews')
    .delete()
    .eq('user_id', userId);
  if (reviewsError) console.error('  Error clearing AI reviews:', reviewsError.message);

  // Leads
  const { error: leadsError } = await supabase
    .from('leads')
    .delete()
    .eq('user_id', userId)
    .like('customer_phone', `${SEED_PHONE_PREFIX}%`);
  if (leadsError) console.error('  Error clearing leads:', leadsError.message);

  // Jobs
  const { error: jobsError } = await supabase
    .from('jobs')
    .delete()
    .eq('user_id', userId)
    .like('customer_phone', `${SEED_PHONE_PREFIX}%`);
  if (jobsError) console.error('  Error clearing jobs:', jobsError.message);

  // Customers
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
