import { addDays, addMinutes, setHours, setMinutes, subMinutes, startOfDay, subDays } from 'date-fns';

// ============================================
// CONFIGURATION
// ============================================

// Phone prefix for seed data identification - allows easy cleanup
export const SEED_PHONE_PREFIX = '+1555';

// Twilio numbers (for SMS log)
const TWILIO_FROM = '+15125559999';
const DISPATCHER_PHONE = '+15125551000';

// ============================================
// DATE/TIME HELPERS
// ============================================

const today = startOfDay(new Date());
const now = new Date();

function todayAt(hour: number, minute = 0): Date {
  return setMinutes(setHours(today, hour), minute);
}

function tomorrowAt(hour: number, minute = 0): Date {
  return setMinutes(setHours(addDays(today, 1), hour), minute);
}

function daysFromNowAt(days: number, hour: number, minute = 0): Date {
  return setMinutes(setHours(addDays(today, days), hour), minute);
}

function yesterdayAt(hour: number, minute = 0): Date {
  return setMinutes(setHours(subDays(today, 1), hour), minute);
}

// ============================================
// CUSTOMERS (10 total)
// Strategic equipment ages for revenue tier demos
// ============================================

export const seedCustomers = [
  // === EXISTING CUSTOMERS (updated with Austin addresses) ===
  {
    name: 'John Martinez',
    phone: '+15551234001',
    email: 'john.martinez@email.com',
    address: '123 Oak Street, Austin, TX 78701',
    equipment: [
      { type: 'Central AC', brand: 'Carrier', model: '24ACC636', year: 2019, location: 'Backyard' },
      { type: 'Furnace', brand: 'Lennox', model: 'EL296V', year: 2019, location: 'Garage' }
    ],
    notes: 'Prefers morning appointments. Gate code: 1234. Dog in backyard - friendly.',
  },
  {
    name: 'Sarah Johnson',
    phone: '+15551234002',
    email: 'sarah.j@email.com',
    address: '456 Pine Avenue, Austin, TX 78702',
    equipment: [
      { type: 'Heat Pump', brand: 'Trane', model: 'XR15', year: 2021, location: 'Side yard' }
    ],
    notes: 'Works from home. Text before arriving.',
  },
  {
    name: 'Mike Williams',
    phone: '+15551234003',
    email: null,
    address: '789 Elm Drive, Austin, TX 78703',
    equipment: [
      { type: 'Central AC', brand: 'Rheem', model: 'RA1636AJ1NA', year: 2018, location: 'Roof' }
    ],
    notes: 'Annual maintenance customer since 2020.',
  },
  {
    name: 'Lisa Chen',
    phone: '+15551234004',
    email: 'lisa.chen@email.com',
    address: '321 Maple Lane, Austin, TX 78704',
    equipment: [
      { type: 'Furnace', brand: 'Goodman', model: 'GMVC960803BN', year: 2017, location: 'Attic' }
    ],
    notes: null,
  },
  {
    name: 'Robert Davis',
    phone: '+15551234005',
    email: 'rdavis@email.com',
    address: '654 Cedar Court, Austin, TX 78705',
    equipment: [
      { type: 'Central AC', brand: 'Lennox', model: 'XC21', year: 2020, location: 'Backyard' },
      { type: 'Water Heater', brand: 'Rheem', model: 'PROG50-38N', year: 2022, location: 'Garage' }
    ],
    notes: 'VIP customer. Always asks for same-day service.',
  },
  {
    name: 'Jennifer Brown',
    phone: '+15551234006',
    email: 'jen.brown@email.com',
    address: '987 Birch Way, Austin, TX 78731',
    equipment: [
      { type: 'Central AC', brand: 'Carrier', model: 'Infinity 26', year: 2022, location: 'Side of house' }
    ],
    notes: 'New customer. Referred by John Martinez.',
  },

  // === NEW CUSTOMERS (strategic for demo) ===

  // Patricia Henderson - R-22 REPLACEMENT OPPORTUNITY ($$$$)
  {
    name: 'Patricia Henderson',
    phone: '+15551234012',
    email: 'patricia.h@email.com',
    address: '2100 Ranch Road 620, Austin, TX 78734',
    equipment: [
      {
        type: 'Central AC',
        brand: 'Carrier',
        model: 'Legacy 38CK',
        year: 2003,  // 22 years old - replacement!
        location: 'Backyard'
      }
    ],
    notes: 'System uses R-22 refrigerant. Discussed replacement during last visit. Prefers financing options.',
  },

  // Marcus Thompson - VIP RESTAURANT OWNER (emergency demo)
  {
    name: 'Marcus Thompson',
    phone: '+15551234013',
    email: 'mthompson@thompsonrestaurants.com',
    address: '456 Westlake Drive, Austin, TX 78746',
    equipment: [
      {
        type: 'Commercial AC',
        brand: 'Trane',
        model: 'XL20i',
        year: 2015,
        location: 'Roof'
      },
      {
        type: 'Walk-in Cooler',
        brand: 'Kolpak',
        model: 'P7-1010-CT',
        year: 2018,
        location: 'Kitchen'
      }
    ],
    notes: 'VIP - Owner of Thompson Restaurant Group (5 locations). Authorize repairs up to $5k without callback. Always same-day service.',
  },

  // Elena Rodriguez - ELDERLY CUSTOMER (emergency demo)
  {
    name: 'Elena Rodriguez',
    phone: '+15551234014',
    email: null,
    address: '789 South Congress Ave, Austin, TX 78704',
    equipment: [
      {
        type: 'Heat Pump',
        brand: 'Rheem',
        model: 'RP14',
        year: 2010,
        location: 'Side yard'
      }
    ],
    notes: 'Elderly customer. Gate code: 5678. Daughter handles billing: daughter@email.com (512-555-9876)',
  },

  // Brandon Cole - NEW CUSTOMER (referral demo)
  {
    name: 'Brandon Cole',
    phone: '+15551234015',
    email: 'bcole@email.com',
    address: '321 Mueller Blvd, Austin, TX 78723',
    equipment: [],  // New customer - no equipment on file yet
    notes: 'New customer - referred by John Martinez. First-time caller.',
  },
];

// ============================================
// JOBS (15 total) - All revenue tiers
// ============================================

export const seedJobs = [
  // ============================================
  // $$$$ REPLACEMENT TIER (2 jobs)
  // ============================================

  // Patricia Henderson - R-22 system replacement (TODAY 2:30 PM)
  {
    customer_name: 'Patricia Henderson',
    customer_phone: '+15551234012',
    customer_address: '2100 Ranch Road 620, Austin, TX 78734',
    service_type: 'hvac' as const,
    urgency: 'high' as const,
    status: 'confirmed' as const,
    scheduled_at: todayAt(14, 30),
    estimated_value: 10000,
    ai_summary: 'AC not cooling properly. R-22 system is 22 years old. Customer interested in replacement quote with financing options.',
    is_ai_booked: true,
    booking_confirmed: false,  // HIGH VALUE - needs review!
    // Revenue tier
    revenue_tier: 'replacement' as const,
    revenue_tier_label: '$$$$' as const,
    revenue_tier_description: 'Potential Replacement',
    revenue_tier_range: '$5,000-$15,000+',
    revenue_tier_signals: ['R-22 system', '22 years old', 'Not cooling properly'],
    revenue_confidence: 'high' as const,
    // Diagnostic context
    problem_duration: '2 days',
    problem_onset: 'Started Tuesday afternoon',
    problem_pattern: 'Gets worse in afternoon heat',
    customer_attempted_fixes: 'Changed air filter, checked thermostat settings',
  },

  // Old system assessment - replacement likely
  {
    customer_name: 'Amanda Peters',
    customer_phone: '+15551234007',
    customer_address: '111 Willow Street, Austin, TX 78757',
    service_type: 'hvac' as const,
    urgency: 'medium' as const,
    status: 'confirmed' as const,
    scheduled_at: daysFromNowAt(2, 9, 0),
    estimated_value: 8500,
    ai_summary: 'System making loud noise on startup. Unit is 18 years old, likely needs replacement rather than repair.',
    is_ai_booked: true,
    booking_confirmed: false,  // Needs review
    revenue_tier: 'replacement' as const,
    revenue_tier_label: '$$$$' as const,
    revenue_tier_description: 'Potential Replacement',
    revenue_tier_range: '$5,000-$15,000+',
    revenue_tier_signals: ['18 years old', 'Loud noise on startup', 'Replacement likely'],
    revenue_confidence: 'medium' as const,
    problem_duration: '1 week',
    problem_onset: 'Gradual worsening',
    problem_pattern: 'Every startup',
    customer_attempted_fixes: null,
  },

  // ============================================
  // $$$ MAJOR REPAIR TIER (3 jobs)
  // ============================================

  // Marcus Thompson - VIP compressor repair (TODAY - EN ROUTE)
  {
    customer_name: 'Marcus Thompson',
    customer_phone: '+15551234013',
    customer_address: '456 Westlake Drive, Austin, TX 78746',
    service_type: 'hvac' as const,
    urgency: 'emergency' as const,
    status: 'en_route' as const,
    scheduled_at: todayAt(10, 0),
    estimated_value: 1900,
    ai_summary: 'Commercial AC compressor making grinding noise. VIP restaurant owner - kitchen reaching 95F. Same-day emergency service.',
    is_ai_booked: false,
    booking_confirmed: true,
    travel_started_at: subMinutes(now, 25),
    revenue_tier: 'major_repair' as const,
    revenue_tier_label: '$$$' as const,
    revenue_tier_description: 'Major Repair',
    revenue_tier_range: '$800-$3,000',
    revenue_tier_signals: ['Compressor', 'Grinding noise', 'Commercial unit'],
    revenue_confidence: 'high' as const,
    problem_duration: 'Started this morning',
    problem_onset: 'Sudden - heard loud grinding',
    problem_pattern: 'Continuous when running',
    customer_attempted_fixes: 'Turned off system',
  },

  // John Martinez - Compressor repair follow-up
  {
    customer_name: 'John Martinez',
    customer_phone: '+15551234001',
    customer_address: '123 Oak Street, Austin, TX 78701',
    service_type: 'hvac' as const,
    urgency: 'high' as const,
    status: 'on_site' as const,
    scheduled_at: todayAt(9, 0),
    estimated_value: 1200,
    ai_summary: 'AC compressor not starting. System is 5 years old. May need capacitor or compressor replacement.',
    is_ai_booked: false,
    booking_confirmed: true,
    travel_started_at: subMinutes(now, 45),
    started_at: subMinutes(now, 20),
    revenue_tier: 'major_repair' as const,
    revenue_tier_label: '$$$' as const,
    revenue_tier_description: 'Major Repair',
    revenue_tier_range: '$800-$3,000',
    revenue_tier_signals: ['Compressor not starting', 'May need replacement'],
    revenue_confidence: 'medium' as const,
    problem_duration: 'Since yesterday',
    problem_onset: 'After power outage',
    problem_pattern: 'Will not start at all',
    customer_attempted_fixes: 'Reset breaker, checked thermostat',
  },

  // Heat exchanger inspection
  {
    customer_name: 'Lisa Chen',
    customer_phone: '+15551234004',
    customer_address: '321 Maple Lane, Austin, TX 78704',
    service_type: 'hvac' as const,
    urgency: 'high' as const,
    status: 'confirmed' as const,
    scheduled_at: todayAt(15, 0),
    estimated_value: 2200,
    ai_summary: 'Furnace making strange smell. Customer concerned about carbon monoxide. Heat exchanger inspection needed.',
    is_ai_booked: true,
    booking_confirmed: false,  // Needs review - safety concern
    revenue_tier: 'major_repair' as const,
    revenue_tier_label: '$$$' as const,
    revenue_tier_description: 'Major Repair',
    revenue_tier_range: '$800-$3,000',
    revenue_tier_signals: ['Strange smell', 'Heat exchanger', 'Safety concern'],
    revenue_confidence: 'medium' as const,
    problem_duration: '3 days',
    problem_onset: 'Noticed when heating started',
    problem_pattern: 'When furnace runs',
    customer_attempted_fixes: 'Opened windows, bought CO detector',
  },

  // ============================================
  // $$ STANDARD REPAIR TIER (5 jobs)
  // ============================================

  // Motor replacement
  {
    customer_name: 'Sarah Johnson',
    customer_phone: '+15551234002',
    customer_address: '456 Pine Avenue, Austin, TX 78702',
    service_type: 'hvac' as const,
    urgency: 'medium' as const,
    status: 'confirmed' as const,
    scheduled_at: todayAt(11, 0),
    estimated_value: 450,
    ai_summary: 'Heat pump blower motor making humming noise. Likely motor bearing failure.',
    is_ai_booked: true,
    booking_confirmed: true,
    revenue_tier: 'standard_repair' as const,
    revenue_tier_label: '$$' as const,
    revenue_tier_description: 'Standard Repair',
    revenue_tier_range: '$200-$800',
    revenue_tier_signals: ['Blower motor', 'Humming noise', 'Bearing failure'],
    revenue_confidence: 'high' as const,
    problem_duration: '1 week',
    problem_onset: 'Gradual',
    problem_pattern: 'Getting louder',
    customer_attempted_fixes: null,
  },

  // Capacitor replacement
  {
    customer_name: 'Mike Williams',
    customer_phone: '+15551234003',
    customer_address: '789 Elm Drive, Austin, TX 78703',
    service_type: 'hvac' as const,
    urgency: 'medium' as const,
    status: 'confirmed' as const,
    scheduled_at: todayAt(13, 0),
    estimated_value: 275,
    ai_summary: 'AC unit clicking but not starting. Classic capacitor failure symptoms.',
    is_ai_booked: false,
    booking_confirmed: true,
    revenue_tier: 'standard_repair' as const,
    revenue_tier_label: '$$' as const,
    revenue_tier_description: 'Standard Repair',
    revenue_tier_range: '$200-$800',
    revenue_tier_signals: ['Clicking', 'Not starting', 'Capacitor'],
    revenue_confidence: 'high' as const,
    problem_duration: 'Started today',
    problem_onset: 'Sudden',
    problem_pattern: 'Every attempt to start',
    customer_attempted_fixes: 'Checked breaker',
  },

  // Refrigerant leak repair
  {
    customer_name: 'Robert Davis',
    customer_phone: '+15551234005',
    customer_address: '654 Cedar Court, Austin, TX 78705',
    service_type: 'hvac' as const,
    urgency: 'high' as const,
    status: 'new' as const,
    scheduled_at: todayAt(16, 30),
    estimated_value: 550,
    ai_summary: 'AC blowing warm air. Refrigerant levels may be low. Leak detection and repair needed.',
    is_ai_booked: true,
    booking_confirmed: false,  // VIP - needs review
    revenue_tier: 'standard_repair' as const,
    revenue_tier_label: '$$' as const,
    revenue_tier_description: 'Standard Repair',
    revenue_tier_range: '$200-$800',
    revenue_tier_signals: ['Warm air', 'Refrigerant', 'Leak detection'],
    revenue_confidence: 'medium' as const,
    problem_duration: '4 days',
    problem_onset: 'Gradual',
    problem_pattern: 'Getting worse each day',
    customer_attempted_fixes: 'Cleaned outdoor unit',
  },

  // Ductwork repair
  {
    customer_name: 'Steve Miller',
    customer_phone: '+15551234010',
    customer_address: '444 Poplar Lane, Austin, TX 78752',
    service_type: 'hvac' as const,
    urgency: 'medium' as const,
    status: 'confirmed' as const,
    scheduled_at: daysFromNowAt(3, 10, 0),
    estimated_value: 400,
    ai_summary: 'Uneven cooling throughout house. Likely ductwork leak or blockage.',
    is_ai_booked: false,
    booking_confirmed: true,
    revenue_tier: 'standard_repair' as const,
    revenue_tier_label: '$$' as const,
    revenue_tier_description: 'Standard Repair',
    revenue_tier_range: '$200-$800',
    revenue_tier_signals: ['Uneven cooling', 'Ductwork'],
    revenue_confidence: 'medium' as const,
    problem_duration: '2 weeks',
    problem_onset: 'Gradual',
    problem_pattern: 'Some rooms hot, others cold',
    customer_attempted_fixes: 'Closed vents in some rooms',
  },

  // Thermostat + diagnostic
  {
    customer_name: 'Nancy Clark',
    customer_phone: '+15551234009',
    customer_address: '333 Aspen Road, Austin, TX 78756',
    service_type: 'hvac' as const,
    urgency: 'low' as const,
    status: 'confirmed' as const,
    scheduled_at: daysFromNowAt(4, 11, 0),
    estimated_value: 350,
    ai_summary: 'Thermostat showing wrong temperature. Wants upgrade to smart thermostat.',
    is_ai_booked: false,
    booking_confirmed: true,
    revenue_tier: 'standard_repair' as const,
    revenue_tier_label: '$$' as const,
    revenue_tier_description: 'Standard Repair',
    revenue_tier_range: '$200-$800',
    revenue_tier_signals: ['Thermostat replacement', 'Smart thermostat upgrade'],
    revenue_confidence: 'high' as const,
    problem_duration: 'Ongoing',
    problem_onset: 'Always been off',
    problem_pattern: 'Constant 3-degree difference',
    customer_attempted_fixes: 'Recalibrated thermostat',
  },

  // ============================================
  // $ MAINTENANCE TIER (3 jobs)
  // ============================================

  // Annual tune-up
  {
    customer_name: 'Jennifer Brown',
    customer_phone: '+15551234006',
    customer_address: '987 Birch Way, Austin, TX 78731',
    service_type: 'hvac' as const,
    urgency: 'low' as const,
    status: 'confirmed' as const,
    scheduled_at: tomorrowAt(9, 0),
    estimated_value: 149,
    ai_summary: 'Seasonal AC tune-up. New customer wants first maintenance checkup.',
    is_ai_booked: false,
    booking_confirmed: true,
    revenue_tier: 'minor' as const,
    revenue_tier_label: '$' as const,
    revenue_tier_description: 'Maintenance',
    revenue_tier_range: '$75-$250',
    revenue_tier_signals: ['Tune-up', 'Maintenance', 'Checkup'],
    revenue_confidence: 'high' as const,
    problem_duration: null,
    problem_onset: null,
    problem_pattern: null,
    customer_attempted_fixes: null,
  },

  // Filter replacement + checkup
  {
    customer_name: 'Tom Anderson',
    customer_phone: '+15551234008',
    customer_address: '222 Spruce Blvd, Austin, TX 78758',
    service_type: 'hvac' as const,
    urgency: 'low' as const,
    status: 'confirmed' as const,
    scheduled_at: daysFromNowAt(5, 10, 0),
    estimated_value: 125,
    ai_summary: 'Filter replacement and quick system check. Customer on maintenance plan.',
    is_ai_booked: true,
    booking_confirmed: true,
    revenue_tier: 'minor' as const,
    revenue_tier_label: '$' as const,
    revenue_tier_description: 'Maintenance',
    revenue_tier_range: '$75-$250',
    revenue_tier_signals: ['Filter replacement', 'Maintenance plan'],
    revenue_confidence: 'high' as const,
    problem_duration: null,
    problem_onset: null,
    problem_pattern: null,
    customer_attempted_fixes: null,
  },

  // ============================================
  // $$? DIAGNOSTIC TIER (1 job)
  // ============================================

  // Unclear scope - needs inspection
  {
    customer_name: 'Brandon Cole',
    customer_phone: '+15551234015',
    customer_address: '321 Mueller Blvd, Austin, TX 78723',
    service_type: 'hvac' as const,
    urgency: 'medium' as const,
    status: 'new' as const,
    scheduled_at: tomorrowAt(14, 0),
    estimated_value: 89,  // Diagnostic fee
    ai_summary: 'New customer - AC not working well. Unclear issue. Needs diagnostic to determine scope.',
    is_ai_booked: true,
    booking_confirmed: false,  // New customer, AI booked
    revenue_tier: 'diagnostic' as const,
    revenue_tier_label: '$$?' as const,
    revenue_tier_description: 'Needs Diagnostic',
    revenue_tier_range: '$89 diagnostic',
    revenue_tier_signals: ['Unclear scope', 'Needs inspection'],
    revenue_confidence: 'low' as const,
    problem_duration: 'A while',
    problem_onset: 'Not sure',
    problem_pattern: 'Sometimes works, sometimes does not',
    customer_attempted_fixes: 'Nothing yet',
  },

  // ============================================
  // COMPLETED JOB (yesterday) - for history
  // ============================================
  {
    customer_name: 'Karen White',
    customer_phone: '+15551234011',
    customer_address: '555 Hickory Drive, Austin, TX 78759',
    service_type: 'hvac' as const,
    urgency: 'medium' as const,
    status: 'complete' as const,
    scheduled_at: yesterdayAt(10, 0),
    completed_at: yesterdayAt(11, 45),
    estimated_value: 275,
    revenue: 285,  // Actual revenue collected
    ai_summary: 'Refrigerant recharge and coil cleaning completed. System running well.',
    is_ai_booked: false,
    booking_confirmed: true,
    revenue_tier: 'standard_repair' as const,
    revenue_tier_label: '$$' as const,
    revenue_tier_description: 'Standard Repair',
    revenue_tier_range: '$200-$800',
    revenue_tier_signals: ['Refrigerant recharge', 'Coil cleaning'],
    revenue_confidence: 'high' as const,
    problem_duration: null,
    problem_onset: null,
    problem_pattern: null,
    customer_attempted_fixes: null,
  },
];

// ============================================
// LEADS (8 total) - Various priorities + sales
// ============================================

export const seedLeads = [
  // ============================================
  // HOT LEADS
  // ============================================

  // $$$$ Sales lead - replacement inquiry (uses callback_requested status with sales notes)
  {
    customer_name: 'Diana Walsh',
    customer_phone: '+15551235001',
    customer_address: '1500 Barton Springs Rd, Austin, TX 78704',
    status: 'callback_requested' as const,
    priority: 'hot' as const,
    why_not_booked: 'Needs replacement quote, not repair - SALES LEAD',
    issue_description: 'Central AC is 18 years old, finally died. Wants new high-efficiency system with financing.',
    service_type: 'hvac' as const,
    urgency: 'high' as const,
    estimated_value: 12000,
    callback_requested_at: subMinutes(now, 90).toISOString(),
    ai_summary: 'Customer called about dead AC. 18-year-old system ready to replace. Very interested in high-SEER unit. Asked for owner callback with quote and financing options. Mentioned neighbor got quote for $14k. Budget seems flexible.',
    revenue_tier: 'replacement' as const,
    revenue_tier_label: '$$$$' as const,
    revenue_tier_description: 'Potential Replacement',
    revenue_tier_range: '$5,000-$15,000+',
    revenue_tier_signals: ['18 years old', 'System dead', 'Replacement inquiry', 'High-efficiency wanted', 'Financing mentioned'],
    revenue_confidence: 'high' as const,
    sales_lead_notes: 'Interested in Carrier or Trane. Mentioned neighbor got $14k quote. Wants SEER 20+. Open to financing.',
    equipment_type: 'Central AC',
    equipment_age: '18 years',
  },

  // $$$ Callback requested - major repair
  {
    customer_name: 'David Kim',
    customer_phone: '+15551235002',
    customer_address: '100 Main Street, Austin, TX 78701',
    status: 'callback_requested' as const,
    priority: 'hot' as const,
    why_not_booked: 'Wanted to check prices with spouse first',
    issue_description: 'AC compressor making loud noise. May need replacement.',
    service_type: 'hvac' as const,
    urgency: 'high' as const,
    estimated_value: 1800,
    callback_requested_at: subMinutes(now, 120).toISOString(),
    ai_summary: 'Customer called about loud compressor. Seemed ready to book but wanted to discuss cost with spouse. Requested callback in 2 hours. Sounded concerned about the noise.',
    revenue_tier: 'major_repair' as const,
    revenue_tier_label: '$$$' as const,
    revenue_tier_description: 'Major Repair',
    revenue_tier_range: '$800-$3,000',
    revenue_tier_signals: ['Compressor', 'Loud noise', 'May need replacement'],
    revenue_confidence: 'medium' as const,
  },

  // $$ Callback requested - schedule conflict
  {
    customer_name: 'Amanda White',
    customer_phone: '+15551235003',
    customer_address: '200 Second Avenue, Austin, TX 78702',
    status: 'callback_requested' as const,
    priority: 'hot' as const,
    why_not_booked: 'At work, needs to check schedule',
    issue_description: 'Furnace not igniting. Getting error code E3 on thermostat.',
    service_type: 'hvac' as const,
    urgency: 'high' as const,
    estimated_value: 400,
    callback_requested_at: subMinutes(now, 45).toISOString(),
    ai_summary: 'Urgent furnace issue but customer at work. Asked to call back after 5pm today to schedule for tomorrow morning. Error code E3 indicates ignition failure.',
    revenue_tier: 'standard_repair' as const,
    revenue_tier_label: '$$' as const,
    revenue_tier_description: 'Standard Repair',
    revenue_tier_range: '$200-$800',
    revenue_tier_signals: ['Furnace not igniting', 'Error code E3'],
    revenue_confidence: 'medium' as const,
  },

  // ============================================
  // WARM LEADS
  // ============================================

  // $$$ Thinking - getting quotes
  {
    customer_name: 'Chris Taylor',
    customer_phone: '+15551235004',
    customer_address: '300 Third Street, Austin, TX 78703',
    status: 'thinking' as const,
    priority: 'warm' as const,
    why_not_booked: 'Getting other quotes first',
    issue_description: 'Wants heat pump replacement quote. System is 15 years old.',
    service_type: 'hvac' as const,
    urgency: 'low' as const,
    estimated_value: 7500,
    ai_summary: 'Customer shopping for new heat pump system. Current unit is 15 years old and working but inefficient. Getting 3 quotes before deciding. Wants high-efficiency system.',
    revenue_tier: 'replacement' as const,
    revenue_tier_label: '$$$$' as const,
    revenue_tier_description: 'Potential Replacement',
    revenue_tier_range: '$5,000-$15,000+',
    revenue_tier_signals: ['15 years old', 'Replacement inquiry', 'Heat pump'],
    revenue_confidence: 'medium' as const,
  },

  // $$ Voicemail left
  {
    customer_name: 'Emily Garcia',
    customer_phone: '+15551235005',
    customer_address: '400 Fourth Boulevard, Austin, TX 78704',
    status: 'voicemail_left' as const,
    priority: 'warm' as const,
    why_not_booked: 'No answer - left voicemail',
    issue_description: 'Missed inbound call. Returned call went to voicemail.',
    service_type: 'hvac' as const,
    urgency: 'medium' as const,
    estimated_value: 250,
    ai_summary: 'Inbound call disconnected after 30 seconds. Called back but no answer. Left voicemail asking them to call back. Unknown issue.',
    revenue_tier: 'diagnostic' as const,
    revenue_tier_label: '$$?' as const,
    revenue_tier_description: 'Needs Diagnostic',
    revenue_tier_range: '$89 diagnostic',
    revenue_tier_signals: ['Unknown scope', 'Missed call'],
    revenue_confidence: 'low' as const,
  },

  // $$ Landlord approval needed
  {
    customer_name: 'Michelle Lee',
    customer_phone: '+15551235006',
    customer_address: '600 Sixth Court, Austin, TX 78705',
    status: 'thinking' as const,
    priority: 'warm' as const,
    why_not_booked: 'Landlord needs to approve repair',
    issue_description: 'AC making clicking noise. Tenant needs landlord approval for service.',
    service_type: 'hvac' as const,
    urgency: 'medium' as const,
    estimated_value: 300,
    ai_summary: 'Rental property - tenant called about clicking AC. Waiting for landlord to approve service call. Will call back once approved.',
    revenue_tier: 'standard_repair' as const,
    revenue_tier_label: '$$' as const,
    revenue_tier_description: 'Standard Repair',
    revenue_tier_range: '$200-$800',
    revenue_tier_signals: ['Clicking noise', 'AC repair'],
    revenue_confidence: 'medium' as const,
  },

  // ============================================
  // COLD LEADS
  // ============================================

  // $ Deferred - maintenance plan
  {
    customer_name: 'James Wilson',
    customer_phone: '+15551235007',
    customer_address: '500 Fifth Lane, Austin, TX 78731',
    status: 'deferred' as const,
    priority: 'cold' as const,
    why_not_booked: 'Not ready yet - call back next week',
    issue_description: 'Interested in preventive maintenance plan.',
    service_type: 'hvac' as const,
    urgency: 'low' as const,
    estimated_value: 200,
    remind_at: daysFromNowAt(5, 9, 0).toISOString(),
    ai_summary: 'Customer interested in maintenance plan but traveling this week. Asked to be called back next Monday morning.',
    revenue_tier: 'minor' as const,
    revenue_tier_label: '$' as const,
    revenue_tier_description: 'Maintenance',
    revenue_tier_range: '$75-$250',
    revenue_tier_signals: ['Maintenance plan', 'Preventive'],
    revenue_confidence: 'high' as const,
  },

  // Lost call (customer hung up)
  {
    customer_name: 'Unknown Caller',
    customer_phone: '+15551235008',
    customer_address: null,
    status: 'lost' as const,
    priority: 'cold' as const,
    why_not_booked: 'Customer hung up before completing call',
    issue_description: 'Call disconnected before gathering information.',
    service_type: 'hvac' as const,
    urgency: 'low' as const,
    estimated_value: null,
    ai_summary: 'Customer hung up after 15 seconds. Only said hello and mentioned AC. No contact info collected.',
    revenue_tier: null,
    revenue_tier_label: null,
    revenue_tier_description: null,
    revenue_tier_range: null,
    revenue_tier_signals: null,
    revenue_confidence: null,
  },
];

// ============================================
// CALLS (12 records) - Call history with transcripts
// ============================================

export const seedCalls = [
  // Patricia Henderson - R-22 replacement ($$$$)
  {
    call_id: 'seed_call_001',
    retell_call_id: 'retell_seed_001',
    phone_number: '+15551234012',
    customer_name: 'Patricia Henderson',
    started_at: todayAt(9, 15),
    ended_at: todayAt(9, 22),
    duration_seconds: 420,
    direction: 'inbound' as const,
    outcome: 'completed' as const,
    hvac_issue_type: 'Cooling',
    urgency_tier: 'high',
    problem_description: 'AC not cooling properly. R-22 system is 22 years old.',
    revenue_tier_label: '$$$$',
    revenue_tier_signals: ['R-22 system', '22 years old', 'Not cooling'],
    transcript_object: [
      { role: 'agent' as const, content: 'Thanks for calling ACE Cooling! How can I help you today?' },
      { role: 'user' as const, content: 'Hi, my air conditioner is not cooling very well. It is getting pretty hot in here.' },
      { role: 'agent' as const, content: 'Oh wow, I can imagine that is uncomfortable in this heat. Do you happen to know how old your system is?' },
      { role: 'user' as const, content: 'It is pretty old - I think we have had it for about 22 years. I know it uses that old Freon stuff.' },
      { role: 'agent' as const, content: 'Got it - sounds like an R-22 system. Those are being phased out, so good to know. Let me get your ZIP code to check our service area.' },
      { role: 'user' as const, content: '78734' },
      { role: 'agent' as const, content: 'Perfect, we service your area. Can I get your phone number for our records?' },
      { role: 'user' as const, content: '555-123-4012' },
      { role: 'agent' as const, content: 'Great. Let me check our schedule. I have today at 2:30 PM or tomorrow at 9 AM - which works better for you?' },
      { role: 'user' as const, content: 'Today would be amazing if you can do that!' },
      { role: 'agent' as const, content: 'Absolutely! What is the service address?' },
      { role: 'user' as const, content: '2100 Ranch Road 620, Austin' },
      { role: 'agent' as const, content: 'Got it. You are all set for today at 2:30. Our technician will give you a call when they are on the way. Is there anything else I can help with?' },
      { role: 'user' as const, content: 'No, that is great. Thank you so much!' },
      { role: 'agent' as const, content: 'You are welcome, Patricia! Have a great day and stay cool.' },
    ],
  },

  // Marcus Thompson - VIP compressor emergency ($$$)
  {
    call_id: 'seed_call_002',
    retell_call_id: 'retell_seed_002',
    phone_number: '+15551234013',
    customer_name: 'Marcus Thompson',
    started_at: todayAt(8, 45),
    ended_at: todayAt(8, 52),
    duration_seconds: 420,
    direction: 'inbound' as const,
    outcome: 'completed' as const,
    hvac_issue_type: 'Cooling',
    urgency_tier: 'emergency',
    problem_description: 'Commercial AC compressor making grinding noise. Restaurant kitchen overheating.',
    revenue_tier_label: '$$$',
    revenue_tier_signals: ['Compressor', 'Grinding noise', 'Commercial unit'],
    transcript_object: [
      { role: 'agent' as const, content: 'Thanks for calling ACE Cooling! How can I help you today?' },
      { role: 'user' as const, content: 'This is Marcus Thompson. I need someone out here right now - my restaurant AC is making a terrible grinding sound and the kitchen is already at 95 degrees.' },
      { role: 'agent' as const, content: 'Oh wow, that sounds urgent. Let me see what we can do right away. What is your address?' },
      { role: 'user' as const, content: '456 Westlake Drive. I am a regular customer - we have used you guys before.' },
      { role: 'agent' as const, content: 'Yes, I see your account Mr. Thompson. I can get a technician out there by 10 AM - would that work?' },
      { role: 'user' as const, content: 'That works. Please hurry - we open at 11 and I need this fixed.' },
      { role: 'agent' as const, content: 'Absolutely, we will prioritize this. Our tech will call when they are on the way. Anything else?' },
      { role: 'user' as const, content: 'No, just get here fast. Thanks.' },
      { role: 'agent' as const, content: 'We are on it, Mr. Thompson. Have a great day!' },
    ],
  },

  // John Martinez - compressor repair ($$$)
  {
    call_id: 'seed_call_003',
    retell_call_id: 'retell_seed_003',
    phone_number: '+15551234001',
    customer_name: 'John Martinez',
    started_at: yesterdayAt(16, 30),
    ended_at: yesterdayAt(16, 38),
    duration_seconds: 480,
    direction: 'inbound' as const,
    outcome: 'completed' as const,
    hvac_issue_type: 'Cooling',
    urgency_tier: 'high',
    problem_description: 'AC compressor not starting after power outage.',
    revenue_tier_label: '$$$',
    revenue_tier_signals: ['Compressor not starting', 'After power outage'],
    transcript_object: [
      { role: 'agent' as const, content: 'Thanks for calling ACE Cooling! How can I help you?' },
      { role: 'user' as const, content: 'Hey, this is John Martinez. We had a power outage last night and now my AC will not start.' },
      { role: 'agent' as const, content: 'I am sorry to hear that, John. Can you tell me what happens when you try to turn it on?' },
      { role: 'user' as const, content: 'Nothing. I hear a click from the thermostat but the outside unit does not do anything.' },
      { role: 'agent' as const, content: 'Have you tried resetting the breaker for the AC?' },
      { role: 'user' as const, content: 'Yeah, I flipped it off and on. Still nothing.' },
      { role: 'agent' as const, content: 'Got it. That sounds like it could be the compressor or capacitor. Let me get you scheduled. I have tomorrow morning at 9 AM available.' },
      { role: 'user' as const, content: 'That works. Same address - 123 Oak Street.' },
      { role: 'agent' as const, content: 'Perfect. You are all set for 9 AM tomorrow. Is there anything else?' },
      { role: 'user' as const, content: 'Nope, thanks!' },
    ],
  },

  // Sarah Johnson - motor repair ($$)
  {
    call_id: 'seed_call_004',
    retell_call_id: 'retell_seed_004',
    phone_number: '+15551234002',
    customer_name: 'Sarah Johnson',
    started_at: yesterdayAt(14, 15),
    ended_at: yesterdayAt(14, 21),
    duration_seconds: 360,
    direction: 'inbound' as const,
    outcome: 'completed' as const,
    hvac_issue_type: 'Heating',
    urgency_tier: 'medium',
    problem_description: 'Heat pump blower motor making humming noise.',
    revenue_tier_label: '$$',
    revenue_tier_signals: ['Blower motor', 'Humming noise'],
    transcript_object: [
      { role: 'agent' as const, content: 'Thanks for calling ACE Cooling! How can I help you today?' },
      { role: 'user' as const, content: 'Hi, my heat pump is making this weird humming sound. It has been going on for about a week and getting louder.' },
      { role: 'agent' as const, content: 'That could be the blower motor bearings. Do you know how old your system is?' },
      { role: 'user' as const, content: 'About 3 years old - it is a Trane.' },
      { role: 'agent' as const, content: 'Good news is that should still be under warranty. Let me get you scheduled. How is today at 11 AM?' },
      { role: 'user' as const, content: 'That works for me. I work from home so any time is fine.' },
      { role: 'agent' as const, content: 'Perfect. The technician will text before arriving. Is there anything else?' },
      { role: 'user' as const, content: 'No, that is it. Thanks!' },
    ],
  },

  // Mike Williams - capacitor ($$)
  {
    call_id: 'seed_call_005',
    retell_call_id: 'retell_seed_005',
    phone_number: '+15551234003',
    customer_name: 'Mike Williams',
    started_at: todayAt(7, 45),
    ended_at: todayAt(7, 51),
    duration_seconds: 360,
    direction: 'inbound' as const,
    outcome: 'completed' as const,
    hvac_issue_type: 'Cooling',
    urgency_tier: 'medium',
    problem_description: 'AC clicking but not starting.',
    revenue_tier_label: '$$',
    revenue_tier_signals: ['Clicking', 'Not starting', 'Capacitor'],
    transcript_object: [
      { role: 'agent' as const, content: 'Thanks for calling ACE Cooling! How can I help you?' },
      { role: 'user' as const, content: 'Hi, my AC is clicking but will not start. Started this morning.' },
      { role: 'agent' as const, content: 'Clicking but not starting usually means the capacitor. When was your last maintenance?' },
      { role: 'user' as const, content: 'Last spring. You guys did the tune-up.' },
      { role: 'agent' as const, content: 'Good to know. Let me get you in today. I have 1 PM available.' },
      { role: 'user' as const, content: 'That works. 789 Elm Drive.' },
      { role: 'agent' as const, content: 'Got it. See you at 1 PM!' },
    ],
  },

  // Diana Walsh - sales lead ($$$$)
  {
    call_id: 'seed_call_006',
    retell_call_id: 'retell_seed_006',
    phone_number: '+15551235001',
    customer_name: 'Diana Walsh',
    started_at: subMinutes(now, 95),
    ended_at: subMinutes(now, 88),
    duration_seconds: 420,
    direction: 'inbound' as const,
    outcome: 'sales_lead' as const,
    hvac_issue_type: 'Cooling',
    urgency_tier: 'high',
    problem_description: '18-year-old AC dead, wants replacement quote.',
    revenue_tier_label: '$$$$',
    revenue_tier_signals: ['18 years old', 'System dead', 'Replacement inquiry'],
    transcript_object: [
      { role: 'agent' as const, content: 'Thanks for calling ACE Cooling! How can I help you today?' },
      { role: 'user' as const, content: 'Hi, my AC finally gave up. It is 18 years old and I think it is time for a new one.' },
      { role: 'agent' as const, content: 'I understand. 18 years is a good run for an AC. Are you looking for a replacement quote?' },
      { role: 'user' as const, content: 'Yes, I want something more efficient. My neighbor just got a new system - said it was around $14,000.' },
      { role: 'agent' as const, content: 'We can definitely help with that. For replacement quotes, I will have the owner call you to discuss options. Can I confirm your phone number?' },
      { role: 'user' as const, content: '555-123-5001. I am interested in the high-efficiency models, and I might need financing.' },
      { role: 'agent' as const, content: 'Noted - high efficiency with financing options. The owner will call you within the hour. What is your address for the quote?' },
      { role: 'user' as const, content: '1500 Barton Springs Road.' },
      { role: 'agent' as const, content: 'Perfect. Expect a call shortly. Have a great day!' },
    ],
  },

  // David Kim - callback requested ($$$)
  {
    call_id: 'seed_call_007',
    retell_call_id: 'retell_seed_007',
    phone_number: '+15551235002',
    customer_name: 'David Kim',
    started_at: subMinutes(now, 125),
    ended_at: subMinutes(now, 118),
    duration_seconds: 420,
    direction: 'inbound' as const,
    outcome: 'callback_later' as const,
    hvac_issue_type: 'Cooling',
    urgency_tier: 'high',
    problem_description: 'AC compressor making loud noise.',
    revenue_tier_label: '$$$',
    revenue_tier_signals: ['Compressor', 'Loud noise'],
    transcript_object: [
      { role: 'agent' as const, content: 'Thanks for calling ACE Cooling! How can I help you?' },
      { role: 'user' as const, content: 'My AC is making this really loud banging noise. I am worried it is the compressor.' },
      { role: 'agent' as const, content: 'That does sound concerning. How long has it been making this noise?' },
      { role: 'user' as const, content: 'Just started today. Look, I need to check with my wife about the cost first. Can you call me back in a couple hours?' },
      { role: 'agent' as const, content: 'Of course. What time works best?' },
      { role: 'user' as const, content: 'Around 3 PM? That gives me time to talk to her.' },
      { role: 'agent' as const, content: 'Got it. We will call you back at 3 PM. Is this the best number?' },
      { role: 'user' as const, content: 'Yes, 555-123-5002. Thanks for understanding.' },
    ],
  },

  // Wrong number
  {
    call_id: 'seed_call_008',
    retell_call_id: 'retell_seed_008',
    phone_number: '+15551239001',
    customer_name: null,
    started_at: todayAt(10, 30),
    ended_at: todayAt(10, 31),
    duration_seconds: 45,
    direction: 'inbound' as const,
    outcome: 'wrong_number' as const,
    hvac_issue_type: null,
    urgency_tier: null,
    problem_description: null,
    revenue_tier_label: null,
    revenue_tier_signals: null,
    transcript_object: [
      { role: 'agent' as const, content: 'Thanks for calling ACE Cooling! How can I help you today?' },
      { role: 'user' as const, content: 'Oh, sorry - I was trying to call the pizza place.' },
      { role: 'agent' as const, content: 'No problem! Have a great day!' },
      { role: 'user' as const, content: 'Thanks, bye!' },
    ],
  },

  // Out of service area
  {
    call_id: 'seed_call_009',
    retell_call_id: 'retell_seed_009',
    phone_number: '+15551239002',
    customer_name: 'George Brown',
    started_at: todayAt(11, 15),
    ended_at: todayAt(11, 18),
    duration_seconds: 180,
    direction: 'inbound' as const,
    outcome: 'out_of_area' as const,
    hvac_issue_type: 'Cooling',
    urgency_tier: 'medium',
    problem_description: 'AC not cooling',
    revenue_tier_label: null,
    revenue_tier_signals: null,
    transcript_object: [
      { role: 'agent' as const, content: 'Thanks for calling ACE Cooling! How can I help you?' },
      { role: 'user' as const, content: 'Hi, my AC stopped working. Can you come take a look?' },
      { role: 'agent' as const, content: 'I would be happy to help. What is your ZIP code?' },
      { role: 'user' as const, content: '75201' },
      { role: 'agent' as const, content: 'I am sorry, that is in Dallas. We only service the Austin area. I can recommend some companies up there if you would like.' },
      { role: 'user' as const, content: 'Oh, I see. No that is okay, I will find someone. Thanks anyway.' },
      { role: 'agent' as const, content: 'No problem. Have a great day!' },
    ],
  },

  // Customer hung up (abandoned)
  {
    call_id: 'seed_call_010',
    retell_call_id: 'retell_seed_010',
    phone_number: '+15551235008',
    customer_name: null,
    started_at: subMinutes(now, 180),
    ended_at: subMinutes(now, 179),
    duration_seconds: 15,
    direction: 'inbound' as const,
    outcome: 'customer_hangup' as const,
    hvac_issue_type: null,
    urgency_tier: null,
    problem_description: null,
    revenue_tier_label: null,
    revenue_tier_signals: null,
    transcript_object: [
      { role: 'agent' as const, content: 'Thanks for calling ACE Cooling! How can I help you today?' },
      { role: 'user' as const, content: 'Hello? Is this... AC...' },
    ],
  },

  // Elena Rodriguez - emergency alert (urgent)
  {
    call_id: 'seed_call_011',
    retell_call_id: 'retell_seed_011',
    phone_number: '+15551234014',
    customer_name: 'Elena Rodriguez',
    started_at: subMinutes(now, 50),
    ended_at: subMinutes(now, 44),
    duration_seconds: 360,
    direction: 'inbound' as const,
    outcome: 'urgent_escalation' as const,
    hvac_issue_type: 'Heating',
    urgency_tier: 'emergency',
    problem_description: 'No heat - elderly customer, inside temperature is 58F.',
    revenue_tier_label: '$$',
    revenue_tier_signals: ['No heat', 'Elderly', 'Emergency'],
    transcript_object: [
      { role: 'agent' as const, content: 'Thanks for calling ACE Cooling! How can I help you?' },
      { role: 'user' as const, content: 'My heater stopped working. I am very cold - it is only 58 degrees in here.' },
      { role: 'agent' as const, content: 'I am so sorry to hear that. That is definitely too cold. Let me get you help right away. What is your address?' },
      { role: 'user' as const, content: '789 South Congress Ave. I am 78 years old and I really need heat.' },
      { role: 'agent' as const, content: 'I understand this is urgent. I am sending an alert to our dispatcher right now. Someone will call you back within 15 minutes. Is this the best number?' },
      { role: 'user' as const, content: 'Yes. My daughter is also available at 512-555-9876 if you can not reach me.' },
      { role: 'agent' as const, content: 'Got it. We will have someone call you very shortly. Stay warm!' },
    ],
  },

  // Jennifer Brown - tune-up booking ($)
  {
    call_id: 'seed_call_012',
    retell_call_id: 'retell_seed_012',
    phone_number: '+15551234006',
    customer_name: 'Jennifer Brown',
    started_at: yesterdayAt(11, 0),
    ended_at: yesterdayAt(11, 6),
    duration_seconds: 360,
    direction: 'inbound' as const,
    outcome: 'completed' as const,
    hvac_issue_type: 'Maintenance',
    urgency_tier: 'low',
    problem_description: 'Annual AC tune-up request.',
    revenue_tier_label: '$',
    revenue_tier_signals: ['Tune-up', 'Maintenance'],
    transcript_object: [
      { role: 'agent' as const, content: 'Thanks for calling ACE Cooling! How can I help you?' },
      { role: 'user' as const, content: 'Hi, I would like to schedule a tune-up for my AC. John Martinez recommended you guys.' },
      { role: 'agent' as const, content: 'That is great! We are happy to help. When would you like to schedule?' },
      { role: 'user' as const, content: 'Sometime this week if possible. Morning works best.' },
      { role: 'agent' as const, content: 'I have tomorrow at 9 AM available. Would that work?' },
      { role: 'user' as const, content: 'Perfect! 987 Birch Way in Austin.' },
      { role: 'agent' as const, content: 'You are all set. See you tomorrow at 9 AM!' },
    ],
  },
];

// ============================================
// EMERGENCY ALERTS (2 records)
// ============================================

export const seedEmergencyAlerts = [
  // Marcus Thompson - RESOLVED (yesterday evening -> today morning)
  {
    alert_id: 'seed_alert_001',
    phone_number: '+15551234013',
    customer_name: 'Marcus Thompson',
    customer_address: '456 Westlake Drive, Austin, TX 78746',
    urgency_tier: 'Urgent',
    problem_description: 'No AC - restaurant kitchen reaching 95F. Business impact.',
    sms_sent_at: yesterdayAt(18, 30),
    sms_message_sid: 'SM1234567890abcdef',
    callback_promised_by: yesterdayAt(18, 45),  // 15 min promise
    callback_delivered_at: yesterdayAt(18, 40),  // Called back in 10 min
    callback_status: 'delivered' as const,
    resolved_at: todayAt(10, 30),
    resolution_notes: 'Compressor failure confirmed. Replaced compressor same-day. Restaurant operational by lunch. Customer very satisfied.',
  },

  // Elena Rodriguez - PENDING (today)
  {
    alert_id: 'seed_alert_002',
    phone_number: '+15551234014',
    customer_name: 'Elena Rodriguez',
    customer_address: '789 South Congress Ave, Austin, TX 78704',
    urgency_tier: 'Urgent',
    problem_description: 'No heat - elderly customer (78 years old), inside temperature is 58F.',
    sms_sent_at: subMinutes(now, 45),
    sms_message_sid: 'SM0987654321fedcba',
    callback_promised_by: subMinutes(now, 30),  // 15 min from SMS
    callback_delivered_at: null,
    callback_status: 'pending' as const,
    resolved_at: null,
    resolution_notes: null,
  },
];

// ============================================
// SMS LOG (8 records)
// ============================================

export const seedSmsLog = [
  // Emergency alert - Marcus Thompson (yesterday)
  {
    direction: 'outbound' as const,
    to_phone: DISPATCHER_PHONE,
    from_phone: TWILIO_FROM,
    body: 'URGENT: No AC - restaurant kitchen reaching 95F\nCaller: Marcus Thompson\nPhone: (555) 123-4013\nAddress: 456 Westlake Drive, Austin, TX 78746\nBusiness impact - needs immediate response\nPromised callback within 15 min',
    twilio_sid: 'SM1234567890abcdef',
    status: 'delivered',
    event_type: 'emergency_alert' as const,
    delivery_status: 'delivered',
    created_at: yesterdayAt(18, 30),
  },

  // Operator reply to Marcus alert
  {
    direction: 'inbound' as const,
    to_phone: TWILIO_FROM,
    from_phone: DISPATCHER_PHONE,
    body: '1',  // Reply code 1 = "En route now"
    twilio_sid: null,
    status: 'received',
    event_type: 'operator_reply' as const,
    delivery_status: null,
    created_at: yesterdayAt(18, 35),
  },

  // Emergency alert - Elena Rodriguez (today)
  {
    direction: 'outbound' as const,
    to_phone: DISPATCHER_PHONE,
    from_phone: TWILIO_FROM,
    body: 'URGENT: No heat - elderly customer\nCaller: Elena Rodriguez\nPhone: (555) 123-4014\nAddress: 789 South Congress Ave, Austin, TX 78704\nInside temp: 58F, customer is 78 years old\nDaughter contact: 512-555-9876\nPromised callback within 15 min',
    twilio_sid: 'SM0987654321fedcba',
    status: 'delivered',
    event_type: 'emergency_alert' as const,
    delivery_status: 'delivered',
    created_at: subMinutes(now, 45),
  },

  // Sales lead alert - Diana Walsh
  {
    direction: 'outbound' as const,
    to_phone: DISPATCHER_PHONE,
    from_phone: TWILIO_FROM,
    body: 'SALES LEAD: AC Replacement\nCustomer: Diana Walsh\nPhone: (555) 123-5001\nAddress: 1500 Barton Springs Rd, Austin, TX 78704\nEquipment: Central AC, 18 years old (dead)\nNotes: Wants high-SEER unit, mentioned $14k neighbor quote, interested in financing\nPromised owner callback',
    twilio_sid: 'SM1111111111111111',
    status: 'delivered',
    event_type: 'sales_lead_alert' as const,
    delivery_status: 'delivered',
    created_at: subMinutes(now, 90),
  },

  // Booking notification - Patricia Henderson ($$$$)
  {
    direction: 'outbound' as const,
    to_phone: DISPATCHER_PHONE,
    from_phone: TWILIO_FROM,
    body: 'NEW BOOKING: Patricia Henderson\nTime: Today 2:30 PM\nAddress: 2100 Ranch Road 620, Austin, TX 78734\nIssue: AC not cooling - R-22 system, 22 years old\nValue: $$$$ (Potential Replacement)\nNeeds AI Booking Review',
    twilio_sid: 'SM2222222222222222',
    status: 'delivered',
    event_type: 'booking_notification' as const,
    delivery_status: 'delivered',
    created_at: todayAt(9, 23),
  },

  // Booking notification - Marcus Thompson (VIP emergency)
  {
    direction: 'outbound' as const,
    to_phone: DISPATCHER_PHONE,
    from_phone: TWILIO_FROM,
    body: 'EMERGENCY BOOKING: Marcus Thompson (VIP)\nTime: Today 10:00 AM\nAddress: 456 Westlake Drive, Austin, TX 78746\nIssue: Commercial AC compressor grinding - restaurant\nValue: $$$ (Major Repair)\nVIP - Same-day required',
    twilio_sid: 'SM3333333333333333',
    status: 'delivered',
    event_type: 'booking_notification' as const,
    delivery_status: 'delivered',
    created_at: todayAt(8, 53),
  },

  // Booking notification - John Martinez
  {
    direction: 'outbound' as const,
    to_phone: DISPATCHER_PHONE,
    from_phone: TWILIO_FROM,
    body: 'NEW BOOKING: John Martinez\nTime: Today 9:00 AM\nAddress: 123 Oak Street, Austin, TX 78701\nIssue: AC compressor not starting after power outage\nValue: $$$ (Major Repair)',
    twilio_sid: 'SM4444444444444444',
    status: 'delivered',
    event_type: 'booking_notification' as const,
    delivery_status: 'delivered',
    created_at: yesterdayAt(16, 40),
  },

  // Abandoned call alert
  {
    direction: 'outbound' as const,
    to_phone: DISPATCHER_PHONE,
    from_phone: TWILIO_FROM,
    body: 'MISSED CALL: Customer hung up\nPhone: (555) 123-5008\nDuration: 15 seconds\nNo info collected\nConsider callback attempt',
    twilio_sid: 'SM5555555555555555',
    status: 'delivered',
    event_type: 'abandoned_call' as const,
    delivery_status: 'delivered',
    created_at: subMinutes(now, 178),
  },
];

// ============================================
// OPERATOR NOTES (5 records)
// ============================================

export const seedOperatorNotes = [
  // VIP permanent note - Marcus Thompson
  {
    customer_phone: '+15551234013',
    customer_name: 'Marcus Thompson',
    note_text: 'VIP - Owner of Thompson Restaurant Group (5 locations). Authorize repairs up to $5k without callback. Always requires same-day service. Account in good standing.',
    created_by: 'dispatcher@acecooling.com',
    expires_at: null,  // Permanent
    is_active: true,
  },

  // Active temporary note - Elena Rodriguez (daughter available)
  {
    customer_phone: '+15551234014',
    customer_name: 'Elena Rodriguez',
    note_text: 'Daughter Maria available this week (Dec 12-15) to be present for service. Call daughter at 512-555-9876 30 min before arriving. Elderly customer - handle with care.',
    created_by: 'dispatcher@acecooling.com',
    expires_at: daysFromNowAt(2, 23, 59),  // Expires in 2 days
    is_active: true,
  },

  // Expired temporary note - John Martinez (out of town)
  {
    customer_phone: '+15551234001',
    customer_name: 'John Martinez',
    note_text: 'Out of town Dec 1-10. Do NOT schedule service until after Dec 10.',
    created_by: 'dispatcher@acecooling.com',
    expires_at: daysFromNowAt(-3, 0, 0),  // Expired 3 days ago
    is_active: false,
  },

  // R-22 follow-up note - Patricia Henderson
  {
    customer_phone: '+15551234012',
    customer_name: 'Patricia Henderson',
    note_text: 'Discussed R-22 replacement during November visit. Customer interested in financing options. System is 22 years old and running on borrowed time. Follow up with replacement quote if called back.',
    created_by: 'tech.mike@acecooling.com',
    expires_at: null,
    is_active: true,
  },

  // New customer note - Brandon Cole
  {
    customer_phone: '+15551234015',
    customer_name: 'Brandon Cole',
    note_text: 'New customer - referred by John Martinez. First-time caller. Treat well to encourage repeat business. Address has no gate code needed.',
    created_by: 'AI Assistant',
    expires_at: null,
    is_active: true,
  },
];

// ============================================
// AI BOOKING REVIEWS (auto-created from unconfirmed AI bookings)
// ============================================

export function createAIBookingReviews(
  jobs: Array<{ id: string; scheduled_at: Date | string; is_ai_booked: boolean; booking_confirmed: boolean }>,
  userId: string
) {
  return jobs
    .filter(job => job.is_ai_booked && !job.booking_confirmed)
    .map(job => ({
      user_id: userId,
      job_id: job.id,
      status: 'pending' as const,
      original_scheduled_at: typeof job.scheduled_at === 'string' ? job.scheduled_at : job.scheduled_at.toISOString(),
    }));
}
