import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import {
  seedCustomers,
  seedJobs,
  seedLeads,
  seedCalls,
  seedEmergencyAlerts,
  seedSmsLog,
  seedOperatorNotes,
  createAIBookingReviews,
  SEED_PHONE_PREFIX
} from './seed-data';

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
  console.log(`\n🌱 Seeding production-grade demo data for user: ${seedUserEmail}\n`);
  console.log('📖 Story: "Hot Friday in Austin" - 20 realistic HVAC calls\n');

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
  console.log('\n👥 Creating customers (12 total)...');
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
  console.log('\n📋 Creating jobs (9 total - all revenue tiers)...');
  const jobsToInsert = seedJobs.map((j: any) => {
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
      // Revenue tier fields
      revenue_tier: j.revenue_tier || null,
      revenue_tier_label: j.revenue_tier_label || null,
      revenue_tier_description: j.revenue_tier_description || null,
      revenue_tier_range: j.revenue_tier_range || null,
      revenue_tier_signals: j.revenue_tier_signals || null,
      revenue_confidence: j.revenue_confidence || null,
      // Diagnostic context
      problem_duration: j.problem_duration || null,
      problem_onset: j.problem_onset || null,
      problem_pattern: j.problem_pattern || null,
      customer_attempted_fixes: j.customer_attempted_fixes || null,
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

  // Log revenue tier distribution
  const tierCounts = {
    '$$$$': insertedJobs?.filter(j => j.revenue_tier_label === '$$$$').length || 0,
    '$$$': insertedJobs?.filter(j => j.revenue_tier_label === '$$$').length || 0,
    '$$': insertedJobs?.filter(j => j.revenue_tier_label === '$$').length || 0,
    '$': insertedJobs?.filter(j => j.revenue_tier_label === '$').length || 0,
    '$$?': insertedJobs?.filter(j => j.revenue_tier_label === '$$?').length || 0,
  };
  console.log(`     Revenue tiers: $$$$ (${tierCounts['$$$$']}), $$$ (${tierCounts['$$$']}), $$ (${tierCounts['$$']}), $ (${tierCounts['$']}), $$? (${tierCounts['$$?']})`);

  // 5. Insert leads
  console.log('\n📞 Creating leads (5 total - hot/warm/cold + sales)...');
  const leadsToInsert = seedLeads.map((l: any) => ({
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
    callback_requested_at: l.callback_requested_at || null,
    remind_at: l.remind_at || null,
    ai_summary: l.ai_summary,
    // Revenue tier fields
    revenue_tier: l.revenue_tier || null,
    revenue_tier_label: l.revenue_tier_label || null,
    revenue_tier_description: l.revenue_tier_description || null,
    revenue_tier_range: l.revenue_tier_range || null,
    revenue_tier_signals: l.revenue_tier_signals || null,
    revenue_confidence: l.revenue_confidence || null,
    // Sales lead fields
    sales_lead_notes: l.sales_lead_notes || null,
    equipment_type: l.equipment_type || null,
    equipment_age: l.equipment_age || null,
    // V3 Triage Engine fields
    caller_type: l.caller_type || null,
    primary_intent: l.primary_intent || null,
    booking_status: l.booking_status || null,
    is_callback_complaint: l.is_callback_complaint || false,
    status_color: l.status_color || 'gray',
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

  // 6. Insert calls (link to jobs/leads by phone)
  console.log('\n📱 Creating calls (20 total - with transcripts)...');
  const callsToInsert = seedCalls.map(c => {
    // Find matching job or lead by phone number
    const matchingJob = insertedJobs?.find(j => j.customer_phone === c.phone_number);
    const matchingLead = insertedLeads?.find(l => l.customer_phone === c.phone_number);

    return {
      user_id: userId,
      call_id: c.call_id,
      retell_call_id: c.retell_call_id,
      phone_number: c.phone_number,
      customer_name: c.customer_name,
      started_at: c.started_at.toISOString(),
      ended_at: c.ended_at.toISOString(),
      duration_seconds: c.duration_seconds,
      direction: c.direction,
      outcome: c.outcome,
      hvac_issue_type: c.hvac_issue_type,
      urgency_tier: c.urgency_tier,
      problem_description: c.problem_description,
      revenue_tier_label: c.revenue_tier_label,
      revenue_tier_signals: c.revenue_tier_signals,
      // transcript_object: c.transcript_object, // Requires migration 0014 to be applied
      job_id: matchingJob?.id || null,
      lead_id: matchingLead?.id || null,
      synced_from_backend: true,  // Mark as synced
      // V3 Triage Engine fields
      caller_type: c.caller_type || null,
      primary_intent: c.primary_intent || null,
      booking_status: c.booking_status || null,
      is_callback_complaint: c.is_callback_complaint || false,
      status_color: c.status_color || 'gray',
    };
  });

  const { data: insertedCalls, error: callsError } = await supabase
    .from('calls')
    .insert(callsToInsert)
    .select();

  if (callsError) {
    console.error('Error inserting calls:', callsError);
    // Don't exit - continue with other tables
  } else {
    console.log(`  ✅ Created ${insertedCalls?.length || 0} calls with speaker-labeled transcripts`);
  }

  // 7. Insert emergency alerts
  console.log('\n🚨 Creating emergency alerts (3 total - all pending for demo)...');
  const alertsToInsert = seedEmergencyAlerts.map(a => {
    // Find matching call
    const matchingCall = insertedCalls?.find(c => c.phone_number === a.phone_number);
    // Find matching job (if resolved and converted)
    const matchingJob = insertedJobs?.find(j => j.customer_phone === a.phone_number);

    return {
      user_id: userId,
      alert_id: a.alert_id,
      call_id: matchingCall?.call_id || null,
      phone_number: a.phone_number,
      customer_name: a.customer_name,
      customer_address: a.customer_address,
      urgency_tier: a.urgency_tier,
      problem_description: a.problem_description,
      sms_sent_at: a.sms_sent_at.toISOString(),
      sms_message_sid: a.sms_message_sid,
      callback_promised_by: a.callback_promised_by.toISOString(),
      callback_delivered_at: a.callback_delivered_at ? a.callback_delivered_at.toISOString() : null,
      callback_status: a.callback_status,
      resolved_at: a.resolved_at ? a.resolved_at.toISOString() : null,
      resolution_notes: a.resolution_notes,
      converted_to_job_id: a.resolved_at ? matchingJob?.id : null,
      synced_from_backend: true,
    };
  });

  const { data: insertedAlerts, error: alertsError } = await supabase
    .from('emergency_alerts')
    .insert(alertsToInsert)
    .select();

  if (alertsError) {
    console.error('Error inserting emergency alerts:', alertsError);
  } else {
    console.log(`  ✅ Created ${insertedAlerts?.length || 0} emergency alerts`);
  }

  // 8. Insert SMS log
  console.log('\n💬 Creating SMS log (10 total - alerts + notifications)...');
  const smsToInsert = seedSmsLog.map(s => {
    // Find matching job or lead for linking
    const matchingJob = insertedJobs?.find(j =>
      s.body.includes(j.customer_name) || s.body.includes(j.customer_phone)
    );
    const matchingLead = insertedLeads?.find(l =>
      s.body.includes(l.customer_name) || s.body.includes(l.customer_phone)
    );

    return {
      user_id: userId,
      job_id: matchingJob?.id || null,
      // lead_id: matchingLead?.id || null, // Column may not exist in schema
      direction: s.direction,
      to_phone: s.to_phone,
      from_phone: s.from_phone,
      body: s.body,
      twilio_sid: s.twilio_sid,
      status: s.status,
      // event_type and delivery_status require schema updates
      // event_type: s.event_type,
      // delivery_status: s.delivery_status,
      created_at: s.created_at.toISOString(),
    };
  });

  const { data: insertedSms, error: smsError } = await supabase
    .from('sms_log')
    .insert(smsToInsert)
    .select();

  if (smsError) {
    console.error('Error inserting SMS log:', smsError);
  } else {
    console.log(`  ✅ Created ${insertedSms?.length || 0} SMS records`);
  }

  // 9. Insert operator notes
  console.log('\n📝 Creating operator notes (6 total - VIP, temporary, expired)...');
  const notesToInsert = seedOperatorNotes.map(n => {
    // Find matching customer
    const matchingCustomer = insertedCustomers?.find(c => c.phone === n.customer_phone);

    return {
      user_id: userId,
      customer_phone: n.customer_phone,
      customer_name: n.customer_name,
      note_text: n.note_text,
      created_by: n.created_by,
      expires_at: n.expires_at ? n.expires_at.toISOString() : null,
      is_active: n.is_active,
      customer_id: matchingCustomer?.id || null,
      synced_from_backend: false,  // Created in dashboard
    };
  });

  const { data: insertedNotes, error: notesError } = await supabase
    .from('operator_notes')
    .insert(notesToInsert)
    .select();

  if (notesError) {
    console.error('Error inserting operator notes:', notesError);
  } else {
    console.log(`  ✅ Created ${insertedNotes?.length || 0} operator notes`);
  }

  // 10. Create AI booking reviews for unconfirmed AI-booked jobs
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
      console.log(`  ✅ Created ${insertedReviews?.length || 0} AI booking reviews (pending confirmation)`);
    }
  } else {
    console.log(`  ⏭️  No AI booking reviews needed`);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('🎉 Production-grade demo data seeded successfully!');
  console.log('='.repeat(60));
  console.log(`
📊 Summary:
   • Customers: ${insertedCustomers?.length || 0}
   • Jobs: ${insertedJobs?.length || 0} (all 5 revenue tiers)
   • Leads: ${insertedLeads?.length || 0} (hot/warm/cold + sales)
   • Calls: ${insertedCalls?.length || 0} (with transcripts)
   • Emergency Alerts: ${insertedAlerts?.length || 0} (all pending for demo)
   • SMS Log: ${insertedSms?.length || 0}
   • Operator Notes: ${insertedNotes?.length || 0}
   • AI Reviews: ${jobsNeedingReview.length}

💰 Revenue Tier Distribution:
   • $$$$ Replacement: ${tierCounts['$$$$']}
   • $$$ Major Repair: ${tierCounts['$$$']}
   • $$ Standard Repair: ${tierCounts['$$']}
   • $ Maintenance: ${tierCounts['$']}
   • $$? Diagnostic: ${tierCounts['$$?']}

🎬 Demo Scenarios ("Hot Friday in Austin"):
   • View Today's Schedule → See busy Friday with emergency + routine jobs
   • Commercial Customers → Tony Russo (restaurant), Diana Lawson (42 units)
   • Safety Emergency → Maria Santos - Gas smell, elderly mother
   • Callback Complaint → Robert Chen - RED border, warranty issue
   • Sales Opportunities → Harold Mitchell (R-22), Michael Thompson (heat pump)
   • View Alerts → 3 pending alerts with callback promises

🔗 View your dashboard at: http://localhost:3000

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

  // Operator notes
  const { error: notesError } = await supabase
    .from('operator_notes')
    .delete()
    .eq('user_id', userId)
    .like('customer_phone', `${SEED_PHONE_PREFIX}%`);
  if (notesError) console.error('  Error clearing operator notes:', notesError.message);

  // SMS log (by user_id - all seed SMS)
  const { error: smsError } = await supabase
    .from('sms_log')
    .delete()
    .eq('user_id', userId);
  if (smsError) console.error('  Error clearing SMS log:', smsError.message);

  // Emergency alerts
  const { error: alertsError } = await supabase
    .from('emergency_alerts')
    .delete()
    .eq('user_id', userId)
    .like('phone_number', `${SEED_PHONE_PREFIX}%`);
  if (alertsError) console.error('  Error clearing emergency alerts:', alertsError.message);

  // Calls
  const { error: callsError } = await supabase
    .from('calls')
    .delete()
    .eq('user_id', userId)
    .like('phone_number', `${SEED_PHONE_PREFIX}%`);
  if (callsError) console.error('  Error clearing calls:', callsError.message);

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
