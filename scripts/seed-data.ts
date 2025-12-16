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
// V3 TRIAGE FIELD TYPES
// ============================================

type CallerType = 'residential' | 'commercial' | 'vendor' | 'recruiting' | 'unknown';
type PrimaryIntent = 'new_lead' | 'active_job_issue' | 'booking_request' | 'admin_billing' | 'solicitation';
type BookingStatus = 'confirmed' | 'attempted_failed' | 'not_requested';
type StatusColor = 'red' | 'yellow' | 'green' | 'gray';

// ============================================
// SCENARIO: "HOT FRIDAY IN AUSTIN"
// Peak summer day (102°F), ACE Cooling & Heating
// 20 inbound calls from 7:45 AM - 5:30 PM
// ============================================

// ============================================
// CUSTOMERS (12 total)
// 3 Commercial + 9 Residential
// ============================================

export const seedCustomers = [
  // === COMMERCIAL ACCOUNTS ===

  // Call #1 - Tony Russo (Restaurant Emergency)
  {
    name: 'Tony Russo',
    phone: '+15551234001',
    email: 'tony@bellaitalia.com',
    address: '2500 Lake Austin Blvd, Austin, TX 78703',
    equipment: [
      { type: 'Commercial AC', brand: 'Carrier', model: '50XC', year: 2018, location: 'Roof' },
      { type: 'Walk-in Cooler', brand: 'Kolpak', model: 'P7-0808-CT', year: 2019, location: 'Kitchen' },
    ],
    notes: 'VIP - Owner of Bella Italia (3 locations). Authorize up to $5k without callback. Always needs same-day service.',
  },

  // Call #5 - Diana Lawson (Property Manager)
  {
    name: 'Diana Lawson',
    phone: '+15551234005',
    email: 'dlawson@sunridgeapts.com',
    address: '4200 Manchaca Rd, Austin, TX 78745',
    equipment: [
      { type: 'Central AC (42 units)', brand: 'Rheem', model: 'RA14AZ', year: 2010, location: 'Various' },
    ],
    notes: 'Property Manager - Sunridge Apartments (42 units). Has maintenance budget authority. Prefers scheduled service windows.',
  },

  // Call #14 - Wei Zhang (Commercial Kitchen)
  {
    name: 'Wei Zhang',
    phone: '+15551234014',
    email: 'wei@goldendragonaustin.com',
    address: '9001 N Lamar Blvd, Austin, TX 78753',
    equipment: [
      { type: 'Make-up Air Unit', brand: 'Captive Aire', model: 'A2G', year: 2016, location: 'Roof' },
      { type: 'Commercial AC', brand: 'Trane', model: 'XR15', year: 2017, location: 'Roof' },
    ],
    notes: 'Restaurant - Golden Dragon. Health inspection next week. Willing to pay premium for immediate service.',
  },

  // === RESIDENTIAL ACCOUNTS ===

  // Call #2 - Jessica Palmer (New Homeowner)
  {
    name: 'Jessica Palmer',
    phone: '+15551234002',
    email: 'jpalmer@gmail.com',
    address: '1823 Briarcliff Blvd, Austin, TX 78723',
    equipment: [], // New customer, no equipment on file
    notes: 'New customer - just moved in last month.',
  },

  // Call #3 - Robert Chen (Callback Complaint)
  {
    name: 'Robert Chen',
    phone: '+15551234003',
    email: 'rchen@outlook.com',
    address: '5612 Burnet Rd, Austin, TX 78756',
    equipment: [
      { type: 'Central AC', brand: 'Goodman', model: 'GSX16', year: 2016, location: 'Backyard' },
    ],
    notes: 'CALLBACK COMPLAINT - Previous service 2 weeks ago ($450). Same issue returned. Handle carefully.',
  },

  // Call #6 - Maria Santos (Gas Smell - Safety)
  {
    name: 'Maria Santos',
    phone: '+15551234006',
    email: null,
    address: '3401 S Congress Ave, Austin, TX 78704',
    equipment: [
      { type: 'Furnace', brand: 'Bryant', model: '315AAV', year: 2012, location: 'Attic' },
    ],
    notes: 'Elderly customer. Mother (82) lives with her. Gate code: 4521.',
  },

  // Call #7 - Harold Mitchell (R-22 Replacement)
  {
    name: 'Harold Mitchell',
    phone: '+15551234007',
    email: 'hmitchell@sbcglobal.net',
    address: '8934 Jollyville Rd, Austin, TX 78759',
    equipment: [
      { type: 'Central AC', brand: 'Lennox', model: 'HS29', year: 2001, location: 'Side yard' },
    ],
    notes: 'R-22 system, 24 years old. Wife recovering from surgery - needs cool house. High replacement potential.',
  },

  // Call #8 - Kevin Park (Thermostat Upgrade)
  {
    name: 'Kevin Park',
    phone: '+15551234008',
    email: 'kpark@protonmail.com',
    address: '2109 Windsor Rd, Austin, TX 78703',
    equipment: [
      { type: 'Heat Pump', brand: 'Carrier', model: '25HNB6', year: 2020, location: 'Backyard' },
    ],
    notes: 'New customer. Has Nest thermostat, needs professional install.',
  },

  // Call #10 - Carol Martinez (Annual Checkup)
  {
    name: 'Carol Martinez',
    phone: '+15551234010',
    email: 'carolm@austin.rr.com',
    address: '7702 Shoal Creek Blvd, Austin, TX 78757',
    equipment: [
      { type: 'Central AC', brand: 'Trane', model: 'XL18i', year: 2019, location: 'Backyard' },
    ],
    notes: 'Maintenance plan customer since 2020. Requests tech Mike specifically.',
  },

  // Call #15 - Patricia Nelson (Blower Motor)
  {
    name: 'Patricia Nelson',
    phone: '+15551234015',
    email: 'pnelson@gmail.com',
    address: '4501 Duval St, Austin, TX 78751',
    equipment: [
      { type: 'Central AC', brand: 'Rheem', model: 'RA17', year: 2017, location: 'Side of house' },
    ],
    notes: 'Had capacitor replaced last year.',
  },

  // Call #17 - David Nguyen (Water Leak)
  {
    name: 'David Nguyen',
    phone: '+15551234017',
    email: 'dnguyen@utexas.edu',
    address: '2601 Speedway, Austin, TX 78712',
    equipment: [
      { type: 'Central AC', brand: 'Carrier', model: '24ACC6', year: 2018, location: 'Attic' },
    ],
    notes: 'Professor at UT. Prefers morning appointments.',
  },

  // Call #20 - Linda Cooper (Compressor Noise)
  {
    name: 'Linda Cooper',
    phone: '+15551234020',
    email: 'lcooper@yahoo.com',
    address: '11501 N MoPac Expy, Austin, TX 78759',
    equipment: [
      { type: 'Central AC', brand: 'Lennox', model: 'XC21', year: 2016, location: 'Backyard' },
    ],
    notes: 'Weekend trip planned - needs service before Saturday.',
  },
];

// ============================================
// JOBS (9 total from completed calls)
// ============================================

export const seedJobs = [
  // Call #1 - Tony Russo - Restaurant Emergency ($$$ - TODAY 9:00 AM)
  {
    customer_name: 'Tony Russo',
    customer_phone: '+15551234001',
    customer_address: '2500 Lake Austin Blvd, Austin, TX 78703',
    service_type: 'hvac' as const,
    urgency: 'emergency' as const,
    status: 'en_route' as const,
    scheduled_at: todayAt(9, 0),
    estimated_value: 1900,
    ai_summary: 'Walk-in cooler compressor grinding noise. Kitchen at 88°F, opens at 11 AM. VIP restaurant - 3 locations.',
    is_ai_booked: false,
    booking_confirmed: true,
    travel_started_at: subMinutes(now, 15),
    revenue_tier: 'major_repair' as const,
    revenue_tier_label: '$$$' as const,
    revenue_tier_description: 'Major Repair',
    revenue_tier_range: '$800-$3,000',
    revenue_tier_signals: ['Walk-in cooler', 'Compressor grinding', 'Commercial', 'Business impact'],
    revenue_confidence: 'high' as const,
    problem_duration: 'Started this morning',
    problem_onset: 'Sudden - heard grinding at open',
    problem_pattern: 'Continuous when running',
    customer_attempted_fixes: 'Turned off system',
  },

  // Call #2 - Jessica Palmer - Low Refrigerant ($$ - TODAY 11:30 AM)
  {
    customer_name: 'Jessica Palmer',
    customer_phone: '+15551234002',
    customer_address: '1823 Briarcliff Blvd, Austin, TX 78723',
    service_type: 'hvac' as const,
    urgency: 'high' as const,
    status: 'confirmed' as const,
    scheduled_at: todayAt(11, 30),
    estimated_value: 425,
    ai_summary: 'New homeowner. AC running constantly but house won\'t cool below 78°F. Low refrigerant suspected.',
    is_ai_booked: true,
    booking_confirmed: true,
    revenue_tier: 'standard_repair' as const,
    revenue_tier_label: '$$' as const,
    revenue_tier_description: 'Standard Repair',
    revenue_tier_range: '$200-$800',
    revenue_tier_signals: ['Low refrigerant', 'Not cooling', 'Running constantly'],
    revenue_confidence: 'medium' as const,
    problem_duration: 'Since moved in (1 month)',
    problem_onset: 'Gradual realization',
    problem_pattern: 'Constant - never reaches setpoint',
    customer_attempted_fixes: 'Lowered thermostat, closed blinds',
  },

  // Call #5 - Diana Lawson - Multi-Unit ($$$ - TODAY 1:00 PM)
  {
    customer_name: 'Diana Lawson',
    customer_phone: '+15551234005',
    customer_address: '4200 Manchaca Rd, Austin, TX 78745',
    service_type: 'hvac' as const,
    urgency: 'high' as const,
    status: 'confirmed' as const,
    scheduled_at: todayAt(13, 0),
    estimated_value: 2400,
    ai_summary: '3 units down at Sunridge Apartments (42-unit property). Building is 15 years old, same compressors failing. Quote for preventive replacement needed.',
    is_ai_booked: false,
    booking_confirmed: true,
    revenue_tier: 'major_repair' as const,
    revenue_tier_label: '$$$' as const,
    revenue_tier_description: 'Major Repair',
    revenue_tier_range: '$800-$3,000',
    revenue_tier_signals: ['Multiple units', 'Commercial property', 'Compressor failures', 'Preventive quote'],
    revenue_confidence: 'high' as const,
    problem_duration: 'Reported this morning',
    problem_onset: 'Multiple tenant complaints overnight',
    problem_pattern: '3 units affected - same symptoms',
    customer_attempted_fixes: 'Reset breakers',
  },

  // Call #8 - Kevin Park - Thermostat Install ($ - TUESDAY 10:00 AM)
  {
    customer_name: 'Kevin Park',
    customer_phone: '+15551234008',
    customer_address: '2109 Windsor Rd, Austin, TX 78703',
    service_type: 'hvac' as const,
    urgency: 'low' as const,
    status: 'confirmed' as const,
    scheduled_at: daysFromNowAt(4, 10, 0), // Next Tuesday
    estimated_value: 175,
    ai_summary: 'Smart thermostat installation. Customer has Nest, needs professional install.',
    is_ai_booked: true,
    booking_confirmed: true,
    revenue_tier: 'minor' as const,
    revenue_tier_label: '$' as const,
    revenue_tier_description: 'Maintenance',
    revenue_tier_range: '$75-$250',
    revenue_tier_signals: ['Thermostat install', 'Nest', 'Professional install'],
    revenue_confidence: 'high' as const,
    problem_duration: null,
    problem_onset: null,
    problem_pattern: null,
    customer_attempted_fixes: null,
  },

  // Call #10 - Carol Martinez - Annual Tune-up ($ - NEXT THURSDAY)
  {
    customer_name: 'Carol Martinez',
    customer_phone: '+15551234010',
    customer_address: '7702 Shoal Creek Blvd, Austin, TX 78757',
    service_type: 'hvac' as const,
    urgency: 'low' as const,
    status: 'confirmed' as const,
    scheduled_at: daysFromNowAt(6, 9, 0), // Next Thursday
    estimated_value: 149,
    ai_summary: 'Annual AC tune-up. Maintenance plan customer. Requests tech Mike specifically.',
    is_ai_booked: true,
    booking_confirmed: true,
    revenue_tier: 'minor' as const,
    revenue_tier_label: '$' as const,
    revenue_tier_description: 'Maintenance',
    revenue_tier_range: '$75-$250',
    revenue_tier_signals: ['Tune-up', 'Maintenance plan', 'Annual service'],
    revenue_confidence: 'high' as const,
    problem_duration: null,
    problem_onset: null,
    problem_pattern: null,
    customer_attempted_fixes: null,
  },

  // Call #14 - Wei Zhang - Commercial Kitchen ($$$$ - TODAY 3:00 PM)
  {
    customer_name: 'Wei Zhang',
    customer_phone: '+15551234014',
    customer_address: '9001 N Lamar Blvd, Austin, TX 78753',
    service_type: 'hvac' as const,
    urgency: 'emergency' as const,
    status: 'confirmed' as const,
    scheduled_at: todayAt(15, 0),
    estimated_value: 12000,
    ai_summary: 'Make-up air unit failed - kitchen too hot to work. Commercial hood system related. Health inspection next week. Potential $12k replacement.',
    is_ai_booked: false,
    booking_confirmed: true,
    revenue_tier: 'replacement' as const,
    revenue_tier_label: '$$$$' as const,
    revenue_tier_description: 'Potential Replacement',
    revenue_tier_range: '$5,000-$15,000+',
    revenue_tier_signals: ['Commercial kitchen', 'Make-up air unit', 'Health inspection', 'Replacement likely'],
    revenue_confidence: 'high' as const,
    problem_duration: 'Started yesterday',
    problem_onset: 'After lunch rush',
    problem_pattern: 'Complete failure - no airflow',
    customer_attempted_fixes: 'Opened back door, called previous vendor',
  },

  // Call #15 - Patricia Nelson - Blower Motor ($$$ - TODAY 4:30 PM)
  {
    customer_name: 'Patricia Nelson',
    customer_phone: '+15551234015',
    customer_address: '4501 Duval St, Austin, TX 78751',
    service_type: 'hvac' as const,
    urgency: 'high' as const,
    status: 'confirmed' as const,
    scheduled_at: todayAt(16, 30),
    estimated_value: 650,
    ai_summary: 'AC blowing warm air, fan sounds slow. Had capacitor replaced last year. House at 81°F.',
    is_ai_booked: true,
    booking_confirmed: true,
    revenue_tier: 'major_repair' as const,
    revenue_tier_label: '$$$' as const,
    revenue_tier_description: 'Major Repair',
    revenue_tier_range: '$800-$3,000',
    revenue_tier_signals: ['Blower motor', 'Fan slow', 'Warm air'],
    revenue_confidence: 'medium' as const,
    problem_duration: '2 days',
    problem_onset: 'Gradual - got worse',
    problem_pattern: 'Fan runs but airflow weak',
    customer_attempted_fixes: 'Changed filter',
  },

  // Call #17 - David Nguyen - Condensate Drain ($$ - TOMORROW 8:30 AM)
  {
    customer_name: 'David Nguyen',
    customer_phone: '+15551234017',
    customer_address: '2601 Speedway, Austin, TX 78712',
    service_type: 'hvac' as const,
    urgency: 'medium' as const,
    status: 'confirmed' as const,
    scheduled_at: tomorrowAt(8, 30),
    estimated_value: 195,
    ai_summary: 'Water dripping from AC unit in attic. Catching in bucket. Clogged condensate drain suspected.',
    is_ai_booked: true,
    booking_confirmed: true,
    revenue_tier: 'standard_repair' as const,
    revenue_tier_label: '$$' as const,
    revenue_tier_description: 'Standard Repair',
    revenue_tier_range: '$200-$800',
    revenue_tier_signals: ['Water leak', 'Condensate drain', 'Clogged'],
    revenue_confidence: 'high' as const,
    problem_duration: 'Since yesterday',
    problem_onset: 'Noticed water stain on ceiling',
    problem_pattern: 'Slow drip when AC runs',
    customer_attempted_fixes: 'Placed bucket',
  },

  // Call #20 - Linda Cooper - Compressor Noise ($$$ - SATURDAY 9:00 AM)
  {
    customer_name: 'Linda Cooper',
    customer_phone: '+15551234020',
    customer_address: '11501 N MoPac Expy, Austin, TX 78759',
    service_type: 'hvac' as const,
    urgency: 'high' as const,
    status: 'confirmed' as const,
    scheduled_at: daysFromNowAt(1, 9, 0), // Saturday
    estimated_value: 1200,
    ai_summary: 'Outside unit making loud buzzing/humming. Still cooling but worried about breakdown. Weekend trip planned - needs fixed before leaving.',
    is_ai_booked: true,
    booking_confirmed: true,
    revenue_tier: 'major_repair' as const,
    revenue_tier_label: '$$$' as const,
    revenue_tier_description: 'Major Repair',
    revenue_tier_range: '$800-$3,000',
    revenue_tier_signals: ['Compressor noise', 'Buzzing', 'Breakdown risk'],
    revenue_confidence: 'medium' as const,
    problem_duration: '3 days',
    problem_onset: 'Started after power surge',
    problem_pattern: 'Continuous when unit runs',
    customer_attempted_fixes: 'Watched YouTube videos',
  },
];

// ============================================
// LEADS (5 total - callbacks & sales)
// Includes V3 Triage Fields
// ============================================

export const seedLeads = [
  // Call #3 - Robert Chen - Callback Complaint (HOT - RED)
  {
    customer_name: 'Robert Chen',
    customer_phone: '+15551234003',
    customer_address: '5612 Burnet Rd, Austin, TX 78756',
    status: 'callback_requested' as const,
    priority: 'hot' as const,
    why_not_booked: 'CALLBACK COMPLAINT - Previous service 2 weeks ago didn\'t fix issue. Promised callback within 15 min.',
    issue_description: 'Unit broken again 2 weeks after $450 repair. Same problem returned. Angry, mentioned BBB and Google review.',
    service_type: 'hvac' as const,
    urgency: 'high' as const,
    estimated_value: 89, // Diagnostic - warranty claim
    callback_requested_at: subMinutes(now, 45).toISOString(),
    ai_summary: 'URGENT: Callback complaint. Customer paid $450 two weeks ago for repair, same issue returned. Very unhappy, mentioned BBB/Google review. Previous work order needs review. Reputation risk.',
    revenue_tier: 'diagnostic' as const,
    revenue_tier_label: '$$?' as const,
    revenue_tier_description: 'Needs Diagnostic',
    revenue_tier_range: '$89 diagnostic (may be warranty)',
    revenue_tier_signals: ['Callback complaint', 'Previous repair failed', 'Reputation risk'],
    revenue_confidence: 'low' as const,
    // V3 TRIAGE FIELDS
    caller_type: 'residential' as CallerType,
    primary_intent: 'active_job_issue' as PrimaryIntent,
    booking_status: 'not_requested' as BookingStatus,
    is_callback_complaint: true,
    status_color: 'red' as StatusColor,
  },

  // Call #7 - Harold Mitchell - R-22 Replacement Sales Lead (HOT - YELLOW)
  {
    customer_name: 'Harold Mitchell',
    customer_phone: '+15551234007',
    customer_address: '8934 Jollyville Rd, Austin, TX 78759',
    status: 'callback_requested' as const,
    priority: 'hot' as const,
    why_not_booked: 'SALES LEAD - Wants repair quote AND replacement options. Requested sales manager callback.',
    issue_description: 'AC barely cooling. System is 24 years old, uses R-22. Wife recovering from surgery - needs cool house.',
    service_type: 'hvac' as const,
    urgency: 'high' as const,
    estimated_value: 12000,
    callback_requested_at: subMinutes(now, 120).toISOString(),
    ai_summary: 'High-value sales lead. R-22 system, 24 years old. Knows refrigerant is phased out. Wife post-surgery needs cool house. Interested in both repair quote and replacement options with financing.',
    revenue_tier: 'replacement' as const,
    revenue_tier_label: '$$$$' as const,
    revenue_tier_description: 'Potential Replacement',
    revenue_tier_range: '$5,000-$15,000+',
    revenue_tier_signals: ['R-22 system', '24 years old', 'Replacement inquiry', 'Financing interest'],
    revenue_confidence: 'high' as const,
    sales_lead_notes: 'Wife recovering from surgery. Urgent need for cooling. Open to financing. Knows R-22 is obsolete.',
    equipment_type: 'Central AC',
    equipment_age: '24 years',
    // V3 TRIAGE FIELDS
    caller_type: 'residential' as CallerType,
    primary_intent: 'new_lead' as PrimaryIntent,
    booking_status: 'not_requested' as BookingStatus,
    is_callback_complaint: false,
    status_color: 'yellow' as StatusColor,
  },

  // Call #11 - Brandon Hayes - Rental Property (WARM - YELLOW)
  {
    customer_name: 'Brandon Hayes',
    customer_phone: '+15551234011',
    customer_address: '4823 Airport Blvd, Austin, TX 78751',
    status: 'thinking' as const,
    priority: 'warm' as const,
    why_not_booked: 'Tenant calling - needs landlord approval. Owner (James Liu) must authorize service.',
    issue_description: 'AC making loud clicking noise. Tenant can\'t authorize service.',
    service_type: 'hvac' as const,
    urgency: 'medium' as const,
    estimated_value: 350,
    ai_summary: 'Rental property - tenant called. AC clicking (likely capacitor). Needs landlord James Liu approval. Owner on file but tenant can\'t authorize. Callback to owner needed.',
    revenue_tier: 'standard_repair' as const,
    revenue_tier_label: '$$' as const,
    revenue_tier_description: 'Standard Repair',
    revenue_tier_range: '$200-$800',
    revenue_tier_signals: ['Clicking noise', 'Capacitor likely', 'Landlord approval'],
    revenue_confidence: 'medium' as const,
    // V3 TRIAGE FIELDS
    caller_type: 'residential' as CallerType,
    primary_intent: 'new_lead' as PrimaryIntent,
    booking_status: 'not_requested' as BookingStatus,
    is_callback_complaint: false,
    status_color: 'yellow' as StatusColor,
  },

  // Call #16 - Michael Thompson - Heat Pump Quote (WARM - YELLOW)
  {
    customer_name: 'Michael Thompson',
    customer_phone: '+15551234016',
    customer_address: '6701 Bee Cave Rd, Austin, TX 78746',
    status: 'thinking' as const,
    priority: 'warm' as const,
    why_not_booked: 'Getting 3 quotes before deciding. Scheduled in-home consultation.',
    issue_description: 'Want to replace AC with heat pump. Interested in rebates and financing. No rush.',
    service_type: 'hvac' as const,
    urgency: 'low' as const,
    estimated_value: 15000,
    ai_summary: 'Sales opportunity - heat pump replacement. Getting 3 quotes, focused on efficiency. Interested in rebates and financing. Scheduled for in-home consultation next week.',
    revenue_tier: 'replacement' as const,
    revenue_tier_label: '$$$$' as const,
    revenue_tier_description: 'Potential Replacement',
    revenue_tier_range: '$5,000-$15,000+',
    revenue_tier_signals: ['Heat pump conversion', 'Getting quotes', 'Rebate interest', 'Financing interest'],
    revenue_confidence: 'medium' as const,
    sales_lead_notes: 'Eco-conscious. Wants high-efficiency. Budget flexible. Getting competitor quotes.',
    equipment_type: 'Central AC (converting to Heat Pump)',
    equipment_age: 'Current system 12 years',
    // V3 TRIAGE FIELDS
    caller_type: 'residential' as CallerType,
    primary_intent: 'new_lead' as PrimaryIntent,
    booking_status: 'not_requested' as BookingStatus,
    is_callback_complaint: false,
    status_color: 'yellow' as StatusColor,
  },

  // Call #19 - Jennifer Adams - Callback Request (WARM - YELLOW)
  {
    customer_name: 'Jennifer Adams',
    customer_phone: '+15551234019',
    customer_address: '901 W Riverside Dr, Austin, TX 78704',
    status: 'callback_requested' as const,
    priority: 'warm' as const,
    why_not_booked: 'At work, can\'t talk. Requested callback after 5:30 PM.',
    issue_description: 'AC not cooling evenly - some rooms fine. Thinks it might be ductwork.',
    service_type: 'hvac' as const,
    urgency: 'medium' as const,
    estimated_value: 89, // Diagnostic
    callback_requested_at: todayAt(17, 30).toISOString(),
    ai_summary: 'Uneven cooling - some rooms OK, others hot. Customer suspects ductwork issue. At work, requested callback after 5:30 PM. Needs diagnostic to determine scope.',
    revenue_tier: 'diagnostic' as const,
    revenue_tier_label: '$$?' as const,
    revenue_tier_description: 'Needs Diagnostic',
    revenue_tier_range: '$89 diagnostic',
    revenue_tier_signals: ['Uneven cooling', 'Ductwork suspected', 'Unclear scope'],
    revenue_confidence: 'low' as const,
    // V3 TRIAGE FIELDS
    caller_type: 'residential' as CallerType,
    primary_intent: 'new_lead' as PrimaryIntent,
    booking_status: 'not_requested' as BookingStatus,
    is_callback_complaint: false,
    status_color: 'yellow' as StatusColor,
  },
];

// ============================================
// CALLS (20 total - Full transcript records)
// Includes V3 Triage Fields
// ============================================

export const seedCalls = [
  // Call #1 - Tony Russo - Restaurant Emergency (7:45 AM)
  {
    call_id: 'seed_call_001',
    retell_call_id: 'retell_seed_001',
    phone_number: '+15551234001',
    customer_name: 'Tony Russo',
    started_at: todayAt(7, 45),
    ended_at: todayAt(7, 52),
    duration_seconds: 420,
    direction: 'inbound' as const,
    outcome: 'completed' as const,
    hvac_issue_type: 'Cooling',
    urgency_tier: 'emergency',
    problem_description: 'Walk-in cooler compressor making grinding noise. Kitchen at 88°F.',
    revenue_tier_label: '$$$',
    revenue_tier_signals: ['Walk-in cooler', 'Compressor', 'Commercial', 'Business impact'],
    // V3 TRIAGE FIELDS
    caller_type: 'commercial' as CallerType,
    primary_intent: 'new_lead' as PrimaryIntent,
    booking_status: 'confirmed' as BookingStatus,
    is_callback_complaint: false,
    status_color: 'green' as StatusColor,
    transcript_object: [
      { role: 'agent' as const, content: 'Thanks for calling ACE Cooling! How can I help you today?' },
      { role: 'user' as const, content: 'This is Tony from Bella Italia. I need someone here NOW. My walk-in cooler is making a terrible grinding sound and my kitchen is already at 88 degrees.' },
      { role: 'agent' as const, content: 'Oh no, that sounds urgent! Let me help you right away, Tony. What is your address?' },
      { role: 'user' as const, content: '2500 Lake Austin Boulevard. We open at 11 and if this cooler goes down, I am going to lose a lot of inventory.' },
      { role: 'agent' as const, content: 'I understand the urgency. I can get a technician to you by 9 AM this morning. Would that work?' },
      { role: 'user' as const, content: 'Yes, please. Make it happen. You guys have done good work for my other locations.' },
      { role: 'agent' as const, content: 'Absolutely. I have you down for 9 AM at 2500 Lake Austin Blvd. Our tech will call when they are on the way. Is there anything else?' },
      { role: 'user' as const, content: 'No, just get here fast. Thanks.' },
    ],
  },

  // Call #2 - Jessica Palmer - New Homeowner (8:15 AM)
  {
    call_id: 'seed_call_002',
    retell_call_id: 'retell_seed_002',
    phone_number: '+15551234002',
    customer_name: 'Jessica Palmer',
    started_at: todayAt(8, 15),
    ended_at: todayAt(8, 22),
    duration_seconds: 420,
    direction: 'inbound' as const,
    outcome: 'completed' as const,
    hvac_issue_type: 'Cooling',
    urgency_tier: 'high',
    problem_description: 'AC running constantly but house won\'t cool below 78°F.',
    revenue_tier_label: '$$',
    revenue_tier_signals: ['Not cooling', 'Running constantly', 'New homeowner'],
    caller_type: 'residential' as CallerType,
    primary_intent: 'new_lead' as PrimaryIntent,
    booking_status: 'confirmed' as BookingStatus,
    is_callback_complaint: false,
    status_color: 'green' as StatusColor,
    transcript_object: [
      { role: 'agent' as const, content: 'Thanks for calling ACE Cooling! How can I help you today?' },
      { role: 'user' as const, content: 'Hi, I just moved into a new house last month and the AC seems to run all day but never cools below 78 degrees.' },
      { role: 'agent' as const, content: 'That does sound frustrating, especially in this heat! It could be low refrigerant. What is your ZIP code?' },
      { role: 'user' as const, content: '78723.' },
      { role: 'agent' as const, content: 'Great, we service that area. I can get someone out today at 11:30 AM. Would that work?' },
      { role: 'user' as const, content: 'That would be perfect! The address is 1823 Briarcliff Boulevard.' },
      { role: 'agent' as const, content: 'Got it. You are all set for 11:30 AM today. The technician will call when they are on the way.' },
      { role: 'user' as const, content: 'Thank you so much!' },
    ],
  },

  // Call #3 - Robert Chen - Callback Complaint (8:32 AM)
  {
    call_id: 'seed_call_003',
    retell_call_id: 'retell_seed_003',
    phone_number: '+15551234003',
    customer_name: 'Robert Chen',
    started_at: todayAt(8, 32),
    ended_at: todayAt(8, 40),
    duration_seconds: 480,
    direction: 'inbound' as const,
    outcome: 'urgent_escalation' as const,
    hvac_issue_type: 'Cooling',
    urgency_tier: 'high',
    problem_description: 'AC broken again 2 weeks after $450 repair. Callback complaint.',
    revenue_tier_label: '$$?',
    revenue_tier_signals: ['Callback complaint', 'Previous repair failed', 'Reputation risk'],
    caller_type: 'residential' as CallerType,
    primary_intent: 'active_job_issue' as PrimaryIntent,
    booking_status: 'not_requested' as BookingStatus,
    is_callback_complaint: true,
    status_color: 'red' as StatusColor,
    transcript_object: [
      { role: 'agent' as const, content: 'Thanks for calling ACE Cooling! How can I help you today?' },
      { role: 'user' as const, content: 'Yeah, I am REALLY upset. You guys were here TWO WEEKS ago and charged me $450, and now it is broken AGAIN. Same exact problem!' },
      { role: 'agent' as const, content: 'I am so sorry to hear that. That is definitely not the experience we want you to have. Can I get your phone number so I can look up your account?' },
      { role: 'user' as const, content: '555-123-4003. I want someone here TODAY and I better not be charged again for the same thing.' },
      { role: 'agent' as const, content: 'I completely understand your frustration. Let me send an urgent alert to our manager. Someone will call you back within 15 minutes to get this resolved.' },
      { role: 'user' as const, content: 'It better be 15 minutes. I am ready to leave a bad review on Google and contact the BBB if this is not handled.' },
      { role: 'agent' as const, content: 'I hear you, and we take this very seriously. You will receive a callback within 15 minutes. Is this the best number to reach you?' },
      { role: 'user' as const, content: 'Yes. I will be waiting.' },
    ],
  },

  // Call #4 - Marketing Solutions Inc - SEO Pitch / SPAM (8:48 AM)
  {
    call_id: 'seed_call_004',
    retell_call_id: 'retell_seed_004',
    phone_number: '+15559990001',
    customer_name: 'Marketing Solutions Inc',
    started_at: todayAt(8, 48),
    ended_at: todayAt(8, 49),
    duration_seconds: 65,
    direction: 'inbound' as const,
    outcome: 'spam_vendor' as const,
    hvac_issue_type: null,
    urgency_tier: null,
    problem_description: null,
    revenue_tier_label: null,
    revenue_tier_signals: null,
    caller_type: 'vendor' as CallerType,
    primary_intent: 'solicitation' as PrimaryIntent,
    booking_status: 'not_requested' as BookingStatus,
    is_callback_complaint: false,
    status_color: 'gray' as StatusColor,
    transcript_object: [
      { role: 'agent' as const, content: 'Thanks for calling ACE Cooling! How can I help you today?' },
      { role: 'user' as const, content: 'Hi, this is Marketing Solutions. We noticed your Google rankings could be improved and wanted to offer you a free consultation.' },
      { role: 'agent' as const, content: 'Thank you, but we are not interested in marketing services at this time. Have a great day!' },
      { role: 'user' as const, content: 'But we can get you to page one of Google for—' },
      { role: 'agent' as const, content: 'Thank you, goodbye.' },
    ],
  },

  // Call #5 - Diana Lawson - Property Manager (9:05 AM)
  {
    call_id: 'seed_call_005',
    retell_call_id: 'retell_seed_005',
    phone_number: '+15551234005',
    customer_name: 'Diana Lawson',
    started_at: todayAt(9, 5),
    ended_at: todayAt(9, 14),
    duration_seconds: 540,
    direction: 'inbound' as const,
    outcome: 'completed' as const,
    hvac_issue_type: 'Cooling',
    urgency_tier: 'high',
    problem_description: '3 units down at 42-unit apartment complex. Same compressors failing.',
    revenue_tier_label: '$$$',
    revenue_tier_signals: ['Multi-unit', 'Commercial property', 'Multiple failures'],
    caller_type: 'commercial' as CallerType,
    primary_intent: 'new_lead' as PrimaryIntent,
    booking_status: 'confirmed' as BookingStatus,
    is_callback_complaint: false,
    status_color: 'green' as StatusColor,
    transcript_object: [
      { role: 'agent' as const, content: 'Thanks for calling ACE Cooling! How can I help you today?' },
      { role: 'user' as const, content: 'This is Diana Lawson from Sunridge Apartments. I have 3 units with no AC this morning and tenants are calling me non-stop.' },
      { role: 'agent' as const, content: 'That sounds like a challenging morning! How many units total in the building?' },
      { role: 'user' as const, content: '42 units. The building is 15 years old and these compressors keep failing. I need someone out here today, and I also want a quote on preventive replacement.' },
      { role: 'agent' as const, content: 'I can definitely help with both. I have 1 PM available for today. What is the property address?' },
      { role: 'user' as const, content: '4200 Manchaca Road. I have maintenance budget authority so we can move quickly on decisions.' },
      { role: 'agent' as const, content: 'Perfect. I have you scheduled for 1 PM today. The tech will assess all 3 units and provide a quote for preventive measures on the remaining units.' },
      { role: 'user' as const, content: 'That is exactly what I need. Thank you.' },
    ],
  },

  // Call #6 - Maria Santos - Gas Smell / SAFETY EMERGENCY (9:22 AM)
  {
    call_id: 'seed_call_006',
    retell_call_id: 'retell_seed_006',
    phone_number: '+15551234006',
    customer_name: 'Maria Santos',
    started_at: todayAt(9, 22),
    ended_at: todayAt(9, 28),
    duration_seconds: 360,
    direction: 'inbound' as const,
    outcome: 'safety_emergency' as const,
    hvac_issue_type: 'Heating',
    urgency_tier: 'emergency',
    problem_description: 'Gas smell near furnace. Elderly mother (82) in home.',
    revenue_tier_label: '$$$',
    revenue_tier_signals: ['Gas smell', 'Safety concern', 'Elderly occupant'],
    caller_type: 'residential' as CallerType,
    primary_intent: 'new_lead' as PrimaryIntent,
    booking_status: 'not_requested' as BookingStatus,
    is_callback_complaint: false,
    status_color: 'red' as StatusColor,
    transcript_object: [
      { role: 'agent' as const, content: 'Thanks for calling ACE Cooling! How can I help you today?' },
      { role: 'user' as const, content: 'I smell gas near my furnace. I am very worried. My mother is 82 and lives with me.' },
      { role: 'agent' as const, content: 'I understand this is concerning. Have you already turned off the furnace?' },
      { role: 'user' as const, content: 'Yes, I turned it off right away.' },
      { role: 'agent' as const, content: 'Good. If the smell gets stronger or you feel dizzy, please leave the house immediately and call 911. I am sending an emergency alert to our dispatcher right now. Someone will call you back within 15 minutes.' },
      { role: 'user' as const, content: 'Thank you. The smell is faint but I am scared.' },
      { role: 'agent' as const, content: 'I understand. Keep windows open if you can. What is your address?' },
      { role: 'user' as const, content: '3401 South Congress Avenue.' },
      { role: 'agent' as const, content: 'Got it. Someone will call you back very soon. Stay safe.' },
    ],
  },

  // Call #7 - Harold Mitchell - R-22 Sales Lead (9:45 AM)
  {
    call_id: 'seed_call_007',
    retell_call_id: 'retell_seed_007',
    phone_number: '+15551234007',
    customer_name: 'Harold Mitchell',
    started_at: todayAt(9, 45),
    ended_at: todayAt(9, 54),
    duration_seconds: 540,
    direction: 'inbound' as const,
    outcome: 'sales_lead' as const,
    hvac_issue_type: 'Cooling',
    urgency_tier: 'high',
    problem_description: 'R-22 system 24 years old, barely cooling. Replacement candidate.',
    revenue_tier_label: '$$$$',
    revenue_tier_signals: ['R-22 system', '24 years old', 'Replacement inquiry'],
    caller_type: 'residential' as CallerType,
    primary_intent: 'new_lead' as PrimaryIntent,
    booking_status: 'not_requested' as BookingStatus,
    is_callback_complaint: false,
    status_color: 'yellow' as StatusColor,
    transcript_object: [
      { role: 'agent' as const, content: 'Thanks for calling ACE Cooling! How can I help you today?' },
      { role: 'user' as const, content: 'My AC is barely cooling and it is 24 years old. I know it uses that old Freon that is being phased out.' },
      { role: 'agent' as const, content: 'Yes, R-22 systems are no longer manufactured. At 24 years, you are definitely in replacement territory. Are you interested in a repair quote or also looking at replacement options?' },
      { role: 'user' as const, content: 'Both, actually. My wife just had surgery and she really needs the house cool. But I want to know if it is worth repairing or if I should just replace it.' },
      { role: 'agent' as const, content: 'I understand. For replacement quotes and options, I will have our sales manager call you. They can discuss financing options too. What is the best number to reach you?' },
      { role: 'user' as const, content: '555-123-4007. I am home all day caring for my wife.' },
      { role: 'agent' as const, content: 'Perfect. Our sales manager will call you within the hour to discuss your options. What is your address?' },
      { role: 'user' as const, content: '8934 Jollyville Road in Austin.' },
      { role: 'agent' as const, content: 'Got it. You will hear from us soon. I hope your wife feels better!' },
    ],
  },

  // Call #8 - Kevin Park - Thermostat Upgrade (10:12 AM)
  {
    call_id: 'seed_call_008',
    retell_call_id: 'retell_seed_008',
    phone_number: '+15551234008',
    customer_name: 'Kevin Park',
    started_at: todayAt(10, 12),
    ended_at: todayAt(10, 18),
    duration_seconds: 360,
    direction: 'inbound' as const,
    outcome: 'completed' as const,
    hvac_issue_type: 'Maintenance',
    urgency_tier: 'low',
    problem_description: 'Smart thermostat installation - has Nest, needs pro install.',
    revenue_tier_label: '$',
    revenue_tier_signals: ['Thermostat install', 'Nest'],
    caller_type: 'residential' as CallerType,
    primary_intent: 'booking_request' as PrimaryIntent,
    booking_status: 'confirmed' as BookingStatus,
    is_callback_complaint: false,
    status_color: 'green' as StatusColor,
    transcript_object: [
      { role: 'agent' as const, content: 'Thanks for calling ACE Cooling! How can I help you today?' },
      { role: 'user' as const, content: 'Hi, I bought a Nest thermostat and I need someone to install it. I tried myself but the wiring is confusing.' },
      { role: 'agent' as const, content: 'No problem! We install smart thermostats all the time. When would you like to schedule?' },
      { role: 'user' as const, content: 'Sometime next week if possible. I am flexible on time.' },
      { role: 'agent' as const, content: 'I have Tuesday at 10 AM available. Would that work?' },
      { role: 'user' as const, content: 'Perfect. The address is 2109 Windsor Road.' },
      { role: 'agent' as const, content: 'Great. You are scheduled for Tuesday at 10 AM. The tech will call before arriving.' },
      { role: 'user' as const, content: 'Thanks!' },
    ],
  },

  // Call #9 - Unknown - Customer Hangup (10:35 AM)
  {
    call_id: 'seed_call_009',
    retell_call_id: 'retell_seed_009',
    phone_number: '+15559990002',
    customer_name: null,
    started_at: todayAt(10, 35),
    ended_at: todayAt(10, 35),
    duration_seconds: 22,
    direction: 'inbound' as const,
    outcome: 'customer_hangup' as const,
    hvac_issue_type: null,
    urgency_tier: null,
    problem_description: null,
    revenue_tier_label: null,
    revenue_tier_signals: null,
    caller_type: 'unknown' as CallerType,
    primary_intent: 'new_lead' as PrimaryIntent,
    booking_status: 'not_requested' as BookingStatus,
    is_callback_complaint: false,
    status_color: 'gray' as StatusColor,
    transcript_object: [
      { role: 'agent' as const, content: 'Thanks for calling ACE Cooling! How can I help you today?' },
      { role: 'user' as const, content: 'Hello, I need...' },
    ],
  },

  // Call #10 - Carol Martinez - Annual Checkup (10:58 AM)
  {
    call_id: 'seed_call_010',
    retell_call_id: 'retell_seed_010',
    phone_number: '+15551234010',
    customer_name: 'Carol Martinez',
    started_at: todayAt(10, 58),
    ended_at: todayAt(11, 5),
    duration_seconds: 420,
    direction: 'inbound' as const,
    outcome: 'completed' as const,
    hvac_issue_type: 'Maintenance',
    urgency_tier: 'low',
    problem_description: 'Annual AC tune-up. Maintenance plan customer. Requests tech Mike.',
    revenue_tier_label: '$',
    revenue_tier_signals: ['Tune-up', 'Maintenance plan'],
    caller_type: 'residential' as CallerType,
    primary_intent: 'booking_request' as PrimaryIntent,
    booking_status: 'confirmed' as BookingStatus,
    is_callback_complaint: false,
    status_color: 'green' as StatusColor,
    transcript_object: [
      { role: 'agent' as const, content: 'Thanks for calling ACE Cooling! How can I help you today?' },
      { role: 'user' as const, content: 'Hi, my reminder said it is time for my annual tune-up. I am on your maintenance plan.' },
      { role: 'agent' as const, content: 'Great! Let me look you up. Can I have your phone number?' },
      { role: 'user' as const, content: '555-123-4010. And can I request Mike as my technician? He did my service last year and was excellent.' },
      { role: 'agent' as const, content: 'Of course! I will note that request. I have next Thursday at 9 AM available. Does that work?' },
      { role: 'user' as const, content: 'That is perfect.' },
      { role: 'agent' as const, content: 'You are all set for Thursday at 9 AM at 7702 Shoal Creek Boulevard. I have noted your preference for Mike.' },
      { role: 'user' as const, content: 'Wonderful, thank you!' },
    ],
  },

  // Call #11 - Brandon Hayes - Rental Property (11:15 AM)
  {
    call_id: 'seed_call_011',
    retell_call_id: 'retell_seed_011',
    phone_number: '+15551234011',
    customer_name: 'Brandon Hayes',
    started_at: todayAt(11, 15),
    ended_at: todayAt(11, 22),
    duration_seconds: 420,
    direction: 'inbound' as const,
    outcome: 'callback_later' as const,
    hvac_issue_type: 'Cooling',
    urgency_tier: 'medium',
    problem_description: 'Tenant calling - AC clicking noise. Needs landlord approval.',
    revenue_tier_label: '$$',
    revenue_tier_signals: ['Clicking noise', 'Rental property', 'Landlord approval needed'],
    caller_type: 'residential' as CallerType,
    primary_intent: 'new_lead' as PrimaryIntent,
    booking_status: 'not_requested' as BookingStatus,
    is_callback_complaint: false,
    status_color: 'yellow' as StatusColor,
    transcript_object: [
      { role: 'agent' as const, content: 'Thanks for calling ACE Cooling! How can I help you today?' },
      { role: 'user' as const, content: 'Hi, I am a tenant and my AC is making a loud clicking sound. But I need to get approval from my landlord before scheduling service.' },
      { role: 'agent' as const, content: 'I understand. Do you know who your landlord is? We may have them on file.' },
      { role: 'user' as const, content: 'His name is James Liu. The property is at 4823 Airport Boulevard.' },
      { role: 'agent' as const, content: 'Let me check... Yes, we have James Liu on file. Would you like us to reach out to him for authorization?' },
      { role: 'user' as const, content: 'That would be great. I do not want to bother him but the clicking is getting annoying.' },
      { role: 'agent' as const, content: 'I will contact Mr. Liu and arrange service once approved. Is your number the best to reach if we have updates?' },
      { role: 'user' as const, content: 'Yes, 555-123-4011. Thanks for helping!' },
    ],
  },

  // Call #12 - Wrong Number (11:42 AM)
  {
    call_id: 'seed_call_012',
    retell_call_id: 'retell_seed_012',
    phone_number: '+15559990003',
    customer_name: null,
    started_at: todayAt(11, 42),
    ended_at: todayAt(11, 43),
    duration_seconds: 35,
    direction: 'inbound' as const,
    outcome: 'wrong_number' as const,
    hvac_issue_type: null,
    urgency_tier: null,
    problem_description: null,
    revenue_tier_label: null,
    revenue_tier_signals: null,
    caller_type: 'unknown' as CallerType,
    primary_intent: 'new_lead' as PrimaryIntent,
    booking_status: 'not_requested' as BookingStatus,
    is_callback_complaint: false,
    status_color: 'gray' as StatusColor,
    transcript_object: [
      { role: 'agent' as const, content: 'Thanks for calling ACE Cooling! How can I help you today?' },
      { role: 'user' as const, content: 'Is this the pizza place?' },
      { role: 'agent' as const, content: 'No, this is ACE Cooling, an HVAC company. You may have dialed the wrong number.' },
      { role: 'user' as const, content: 'Oh sorry! Wrong number.' },
    ],
  },

  // Call #13 - Amanda Foster - Infant in Home / URGENT (12:05 PM)
  {
    call_id: 'seed_call_013',
    retell_call_id: 'retell_seed_013',
    phone_number: '+15551234013',
    customer_name: 'Amanda Foster',
    started_at: todayAt(12, 5),
    ended_at: todayAt(12, 12),
    duration_seconds: 420,
    direction: 'inbound' as const,
    outcome: 'urgent_escalation' as const,
    hvac_issue_type: 'Cooling',
    urgency_tier: 'emergency',
    problem_description: 'AC completely stopped. House at 84°F. 4-month-old baby in home.',
    revenue_tier_label: '$$',
    revenue_tier_signals: ['System down', 'Infant', 'Emergency'],
    caller_type: 'residential' as CallerType,
    primary_intent: 'new_lead' as PrimaryIntent,
    booking_status: 'not_requested' as BookingStatus,
    is_callback_complaint: false,
    status_color: 'red' as StatusColor,
    transcript_object: [
      { role: 'agent' as const, content: 'Thanks for calling ACE Cooling! How can I help you today?' },
      { role: 'user' as const, content: 'My AC completely stopped working and I have a 4-month-old baby. It is already 84 degrees in here!' },
      { role: 'agent' as const, content: 'I understand this is urgent with a baby in the home. Does the unit make any noise when you try to turn it on?' },
      { role: 'user' as const, content: 'It just clicks and then nothing happens. Please, I need someone as soon as possible.' },
      { role: 'agent' as const, content: 'That clicking usually means the capacitor. I am sending an emergency alert to our dispatcher right now. Someone will call you back within 15 minutes to arrange service.' },
      { role: 'user' as const, content: 'Thank you so much. The address is 7210 Burnet Road.' },
      { role: 'agent' as const, content: 'Got it. In the meantime, try to keep the baby in the coolest room and use fans if you have them. Help is on the way.' },
      { role: 'user' as const, content: 'I will. Thank you!' },
    ],
  },

  // Call #14 - Wei Zhang - Commercial Kitchen (12:28 PM)
  {
    call_id: 'seed_call_014',
    retell_call_id: 'retell_seed_014',
    phone_number: '+15551234014',
    customer_name: 'Wei Zhang',
    started_at: todayAt(12, 28),
    ended_at: todayAt(12, 38),
    duration_seconds: 600,
    direction: 'inbound' as const,
    outcome: 'completed' as const,
    hvac_issue_type: 'Cooling',
    urgency_tier: 'emergency',
    problem_description: 'Make-up air unit failed. Kitchen too hot to work. Health inspection next week.',
    revenue_tier_label: '$$$$',
    revenue_tier_signals: ['Commercial kitchen', 'Make-up air unit', 'Health inspection'],
    caller_type: 'commercial' as CallerType,
    primary_intent: 'new_lead' as PrimaryIntent,
    booking_status: 'confirmed' as BookingStatus,
    is_callback_complaint: false,
    status_color: 'green' as StatusColor,
    transcript_object: [
      { role: 'agent' as const, content: 'Thanks for calling ACE Cooling! How can I help you today?' },
      { role: 'user' as const, content: 'This is Wei from Golden Dragon Restaurant. Our make-up air unit stopped working and the kitchen is too hot for my cooks to work.' },
      { role: 'agent' as const, content: 'I understand this is urgent for your business. How long has it been out?' },
      { role: 'user' as const, content: 'Since yesterday afternoon. We have a health inspection next week and I cannot operate with no ventilation. I will pay extra for fast service.' },
      { role: 'agent' as const, content: 'Let me see what we can do. I have a 3 PM slot open today. What is your address?' },
      { role: 'user' as const, content: '9001 North Lamar Boulevard. The unit is on the roof.' },
      { role: 'agent' as const, content: 'Got it. I will have our commercial specialist there at 3 PM. This may require a replacement if the unit is severely damaged - are you prepared for that discussion?' },
      { role: 'user' as const, content: 'Yes, whatever it takes. I cannot fail that inspection.' },
      { role: 'agent' as const, content: 'Understood. See you at 3 PM, Wei.' },
    ],
  },

  // Call #15 - Patricia Nelson - Blower Motor (1:15 PM)
  {
    call_id: 'seed_call_015',
    retell_call_id: 'retell_seed_015',
    phone_number: '+15551234015',
    customer_name: 'Patricia Nelson',
    started_at: todayAt(13, 15),
    ended_at: todayAt(13, 22),
    duration_seconds: 420,
    direction: 'inbound' as const,
    outcome: 'completed' as const,
    hvac_issue_type: 'Cooling',
    urgency_tier: 'high',
    problem_description: 'AC blowing warm air. Fan sounds slow. House at 81°F.',
    revenue_tier_label: '$$$',
    revenue_tier_signals: ['Blower motor', 'Fan slow', 'Warm air'],
    caller_type: 'residential' as CallerType,
    primary_intent: 'new_lead' as PrimaryIntent,
    booking_status: 'confirmed' as BookingStatus,
    is_callback_complaint: false,
    status_color: 'green' as StatusColor,
    transcript_object: [
      { role: 'agent' as const, content: 'Thanks for calling ACE Cooling! How can I help you today?' },
      { role: 'user' as const, content: 'Hi, my AC is blowing air but it is not cold. And the fan sounds slower than usual.' },
      { role: 'agent' as const, content: 'That could be a blower motor issue. Have you had any work done on the system recently?' },
      { role: 'user' as const, content: 'You guys replaced the capacitor last year. It is already 81 degrees in here.' },
      { role: 'agent' as const, content: 'I see your history. Let me get you in today. I have 4:30 PM available. Does that work?' },
      { role: 'user' as const, content: 'Yes, please! The address is 4501 Duval Street.' },
      { role: 'agent' as const, content: 'Perfect. You are set for 4:30 PM today. Hang in there!' },
    ],
  },

  // Call #16 - Michael Thompson - Heat Pump Quote / Sales Lead (1:48 PM)
  {
    call_id: 'seed_call_016',
    retell_call_id: 'retell_seed_016',
    phone_number: '+15551234016',
    customer_name: 'Michael Thompson',
    started_at: todayAt(13, 48),
    ended_at: todayAt(13, 58),
    duration_seconds: 600,
    direction: 'inbound' as const,
    outcome: 'sales_lead' as const,
    hvac_issue_type: 'Cooling',
    urgency_tier: 'low',
    problem_description: 'Wants to replace AC with heat pump. Getting quotes.',
    revenue_tier_label: '$$$$',
    revenue_tier_signals: ['Heat pump conversion', 'Getting quotes', 'Rebate interest'],
    caller_type: 'residential' as CallerType,
    primary_intent: 'new_lead' as PrimaryIntent,
    booking_status: 'not_requested' as BookingStatus,
    is_callback_complaint: false,
    status_color: 'yellow' as StatusColor,
    transcript_object: [
      { role: 'agent' as const, content: 'Thanks for calling ACE Cooling! How can I help you today?' },
      { role: 'user' as const, content: 'Hi, we are thinking about replacing our AC with a heat pump system. We want to be more energy efficient.' },
      { role: 'agent' as const, content: 'Great choice! Heat pumps can significantly reduce energy costs. How old is your current system?' },
      { role: 'user' as const, content: 'About 12 years. It still works but we are getting quotes before it dies. We heard there are rebates available.' },
      { role: 'agent' as const, content: 'Yes, there are federal and utility rebates. For a project this size, I would recommend an in-home consultation with our sales team. Are you getting other quotes?' },
      { role: 'user' as const, content: 'Yes, we are talking to 3 companies. We are in no rush - just want to make an informed decision.' },
      { role: 'agent' as const, content: 'I completely understand. Let me schedule a consultation for you. What day works best?' },
      { role: 'user' as const, content: 'How about next Wednesday afternoon? The address is 6701 Bee Cave Road.' },
      { role: 'agent' as const, content: 'Perfect. I will have our comfort consultant call you to confirm the exact time. Thank you for considering ACE Cooling!' },
    ],
  },

  // Call #17 - David Nguyen - Water Leak (2:22 PM)
  {
    call_id: 'seed_call_017',
    retell_call_id: 'retell_seed_017',
    phone_number: '+15551234017',
    customer_name: 'David Nguyen',
    started_at: todayAt(14, 22),
    ended_at: todayAt(14, 29),
    duration_seconds: 420,
    direction: 'inbound' as const,
    outcome: 'completed' as const,
    hvac_issue_type: 'Cooling',
    urgency_tier: 'medium',
    problem_description: 'Water dripping from AC in attic. Condensate drain clogged.',
    revenue_tier_label: '$$',
    revenue_tier_signals: ['Water leak', 'Condensate drain', 'Clogged'],
    caller_type: 'residential' as CallerType,
    primary_intent: 'new_lead' as PrimaryIntent,
    booking_status: 'confirmed' as BookingStatus,
    is_callback_complaint: false,
    status_color: 'green' as StatusColor,
    transcript_object: [
      { role: 'agent' as const, content: 'Thanks for calling ACE Cooling! How can I help you today?' },
      { role: 'user' as const, content: 'Hi, I noticed water dripping from my AC unit in the attic. I put a bucket under it but I am worried.' },
      { role: 'agent' as const, content: 'Good call on the bucket! That is usually a clogged condensate drain - easy fix. How long has it been dripping?' },
      { role: 'user' as const, content: 'I noticed a water stain on my ceiling yesterday and found the drip this morning.' },
      { role: 'agent' as const, content: 'I can get someone out tomorrow morning at 8:30 AM. The bucket should hold until then. Does that work?' },
      { role: 'user' as const, content: 'That is perfect. I have an early class but my wife will be home. The address is 2601 Speedway.' },
      { role: 'agent' as const, content: 'Great. The tech will call before arriving. Keep that bucket emptied!' },
    ],
  },

  // Call #18 - Out of Service Area (2:55 PM)
  {
    call_id: 'seed_call_018',
    retell_call_id: 'retell_seed_018',
    phone_number: '+15559990004',
    customer_name: 'Unknown',
    started_at: todayAt(14, 55),
    ended_at: todayAt(14, 58),
    duration_seconds: 180,
    direction: 'inbound' as const,
    outcome: 'out_of_area' as const,
    hvac_issue_type: 'Cooling',
    urgency_tier: 'medium',
    problem_description: 'AC not cooling - but location in Pflugerville (outside service area).',
    revenue_tier_label: null,
    revenue_tier_signals: null,
    caller_type: 'residential' as CallerType,
    primary_intent: 'new_lead' as PrimaryIntent,
    booking_status: 'not_requested' as BookingStatus,
    is_callback_complaint: false,
    status_color: 'gray' as StatusColor,
    transcript_object: [
      { role: 'agent' as const, content: 'Thanks for calling ACE Cooling! How can I help you today?' },
      { role: 'user' as const, content: 'Hi, my AC is not cooling. Can you send someone out?' },
      { role: 'agent' as const, content: 'I would be happy to help! What is your ZIP code?' },
      { role: 'user' as const, content: '78660 - I am in Pflugerville.' },
      { role: 'agent' as const, content: 'I am sorry, but Pflugerville is outside our service area. We focus on Austin and the immediate surrounding areas. I can recommend a partner company that services Pflugerville if you would like.' },
      { role: 'user' as const, content: 'Oh, I see. That is okay, I will find someone. Thanks anyway.' },
      { role: 'agent' as const, content: 'No problem! Good luck with your repair.' },
    ],
  },

  // Call #19 - Jennifer Adams - Callback Request (3:30 PM)
  {
    call_id: 'seed_call_019',
    retell_call_id: 'retell_seed_019',
    phone_number: '+15551234019',
    customer_name: 'Jennifer Adams',
    started_at: todayAt(15, 30),
    ended_at: todayAt(15, 36),
    duration_seconds: 360,
    direction: 'inbound' as const,
    outcome: 'callback_later' as const,
    hvac_issue_type: 'Cooling',
    urgency_tier: 'medium',
    problem_description: 'AC not cooling evenly. Some rooms fine. Ductwork suspected.',
    revenue_tier_label: '$$?',
    revenue_tier_signals: ['Uneven cooling', 'Ductwork suspected'],
    caller_type: 'residential' as CallerType,
    primary_intent: 'new_lead' as PrimaryIntent,
    booking_status: 'not_requested' as BookingStatus,
    is_callback_complaint: false,
    status_color: 'yellow' as StatusColor,
    transcript_object: [
      { role: 'agent' as const, content: 'Thanks for calling ACE Cooling! How can I help you today?' },
      { role: 'user' as const, content: 'Hi, my AC is not cooling evenly. Some rooms are fine but others are hot. I think it might be a ductwork issue?' },
      { role: 'agent' as const, content: 'That is definitely possible. Uneven cooling often indicates duct leaks or blocked vents. When would you like to schedule a diagnostic?' },
      { role: 'user' as const, content: 'Actually, I am at work right now and cannot really talk. Can you call me back after 5:30?' },
      { role: 'agent' as const, content: 'Of course! We will call you back after 5:30 PM today. Is this the best number?' },
      { role: 'user' as const, content: 'Yes, 555-123-4019. The address is 901 West Riverside Drive when you need it.' },
      { role: 'agent' as const, content: 'Got it. Talk to you later today!' },
    ],
  },

  // Call #20 - Linda Cooper - Compressor Noise (4:45 PM)
  {
    call_id: 'seed_call_020',
    retell_call_id: 'retell_seed_020',
    phone_number: '+15551234020',
    customer_name: 'Linda Cooper',
    started_at: todayAt(16, 45),
    ended_at: todayAt(16, 53),
    duration_seconds: 480,
    direction: 'inbound' as const,
    outcome: 'completed' as const,
    hvac_issue_type: 'Cooling',
    urgency_tier: 'high',
    problem_description: 'Outside unit loud buzzing/humming. Still cooling but worried about breakdown.',
    revenue_tier_label: '$$$',
    revenue_tier_signals: ['Compressor noise', 'Buzzing', 'Breakdown risk'],
    caller_type: 'residential' as CallerType,
    primary_intent: 'new_lead' as PrimaryIntent,
    booking_status: 'confirmed' as BookingStatus,
    is_callback_complaint: false,
    status_color: 'green' as StatusColor,
    transcript_object: [
      { role: 'agent' as const, content: 'Thanks for calling ACE Cooling! How can I help you today?' },
      { role: 'user' as const, content: 'Hi, my outside unit is making a loud buzzing sound. It is still cooling but I am worried it is about to break down.' },
      { role: 'agent' as const, content: 'Good instinct to call - that buzzing could indicate a compressor issue. How long has it been making this noise?' },
      { role: 'user' as const, content: 'About 3 days. It started after we had a power surge. I am going out of town this weekend and really need it fixed before I leave.' },
      { role: 'agent' as const, content: 'I understand. Let me see... I have Saturday morning at 9 AM available. Would that work?' },
      { role: 'user' as const, content: 'That is cutting it close - we leave Saturday afternoon. Can you really have it fixed by then?' },
      { role: 'agent' as const, content: 'Our tech will assess and make repairs if possible. Most compressor issues can be fixed same-visit. What is your address?' },
      { role: 'user' as const, content: '11501 North MoPac Expressway. Thank you!' },
      { role: 'agent' as const, content: 'You are scheduled for Saturday at 9 AM. Have a great trip!' },
    ],
  },
];

// ============================================
// EMERGENCY ALERTS (3 records)
// ============================================

export const seedEmergencyAlerts = [
  // Call #3 - Robert Chen - Callback Complaint (Priority)
  {
    alert_id: 'seed_alert_001',
    phone_number: '+15551234003',
    customer_name: 'Robert Chen',
    customer_address: '5612 Burnet Rd, Austin, TX 78756',
    urgency_tier: 'Urgent',
    problem_description: 'CALLBACK COMPLAINT: AC broken again 2 weeks after $450 repair. Threatening BBB/Google review. Reputation risk.',
    sms_sent_at: subMinutes(now, 40),
    sms_message_sid: 'SM_SEED_CHEN_001',
    callback_promised_by: subMinutes(now, 25), // 15 min promise, now OVERDUE
    callback_delivered_at: null,
    callback_status: 'pending' as const,
    resolved_at: null,
    resolution_notes: null,
  },

  // Call #6 - Maria Santos - Gas Smell (Life Safety)
  {
    alert_id: 'seed_alert_002',
    phone_number: '+15551234006',
    customer_name: 'Maria Santos',
    customer_address: '3401 S Congress Ave, Austin, TX 78704',
    urgency_tier: 'LifeSafety',
    problem_description: 'GAS SMELL near furnace. Elderly mother (82) in home. Furnace turned off. Windows open.',
    sms_sent_at: subMinutes(now, 35),
    sms_message_sid: 'SM_SEED_SANTOS_002',
    callback_promised_by: subMinutes(now, 20), // 15 min promise, OVERDUE
    callback_delivered_at: null,
    callback_status: 'pending' as const,
    resolved_at: null,
    resolution_notes: null,
  },

  // Call #13 - Amanda Foster - Infant in Home
  {
    alert_id: 'seed_alert_003',
    phone_number: '+15551234013',
    customer_name: 'Amanda Foster',
    customer_address: '7210 Burnet Rd, Austin, TX 78757',
    urgency_tier: 'Urgent',
    problem_description: 'AC completely down. House at 84°F. 4-MONTH-OLD BABY in home. Clicking sound (capacitor likely).',
    sms_sent_at: subMinutes(now, 25),
    sms_message_sid: 'SM_SEED_FOSTER_003',
    callback_promised_by: subMinutes(now, 10), // 15 min promise, OVERDUE
    callback_delivered_at: null,
    callback_status: 'pending' as const,
    resolved_at: null,
    resolution_notes: null,
  },
];

// ============================================
// SMS LOG (10 records)
// ============================================

export const seedSmsLog = [
  // Emergency Alert - Robert Chen (Callback Complaint)
  {
    direction: 'outbound' as const,
    to_phone: DISPATCHER_PHONE,
    from_phone: TWILIO_FROM,
    body: 'PRIORITY: CALLBACK COMPLAINT\nCustomer: Robert Chen\nPhone: (555) 123-4003\nAddress: 5612 Burnet Rd, Austin, TX 78756\nIssue: AC broken again 2 weeks after $450 repair\nRisk: Threatening BBB and Google review\nPromised callback within 15 min',
    twilio_sid: 'SM_SEED_CHEN_001',
    status: 'delivered',
    event_type: 'emergency_alert' as const,
    delivery_status: 'delivered',
    created_at: subMinutes(now, 40),
  },

  // Emergency Alert - Maria Santos (Gas Smell)
  {
    direction: 'outbound' as const,
    to_phone: DISPATCHER_PHONE,
    from_phone: TWILIO_FROM,
    body: 'LIFE SAFETY ALERT: Gas Smell\nCustomer: Maria Santos\nPhone: (555) 123-4006\nAddress: 3401 S Congress Ave, Austin, TX 78704\nSituation: Gas smell near furnace. Elderly mother (82) in home.\nFurnace OFF, windows open.\nPromised callback within 15 min',
    twilio_sid: 'SM_SEED_SANTOS_002',
    status: 'delivered',
    event_type: 'emergency_alert' as const,
    delivery_status: 'delivered',
    created_at: subMinutes(now, 35),
  },

  // Emergency Alert - Amanda Foster (Baby)
  {
    direction: 'outbound' as const,
    to_phone: DISPATCHER_PHONE,
    from_phone: TWILIO_FROM,
    body: 'URGENT: Infant in Home\nCustomer: Amanda Foster\nPhone: (555) 123-4013\nAddress: 7210 Burnet Rd, Austin, TX 78757\nSituation: AC completely down, house 84°F\n4-MONTH-OLD BABY in home\nClicking sound - likely capacitor\nPromised callback within 15 min',
    twilio_sid: 'SM_SEED_FOSTER_003',
    status: 'delivered',
    event_type: 'emergency_alert' as const,
    delivery_status: 'delivered',
    created_at: subMinutes(now, 25),
  },

  // Sales Lead Alert - Harold Mitchell (R-22 Replacement)
  {
    direction: 'outbound' as const,
    to_phone: DISPATCHER_PHONE,
    from_phone: TWILIO_FROM,
    body: 'SALES LEAD: AC Replacement\nCustomer: Harold Mitchell\nPhone: (555) 123-4007\nAddress: 8934 Jollyville Rd, Austin, TX 78759\nEquipment: Central AC, R-22, 24 years old\nNotes: Wife post-surgery needs cooling. Open to financing.\nHigh-value opportunity: $12k+',
    twilio_sid: 'SM_SEED_MITCHELL_004',
    status: 'delivered',
    event_type: 'sales_lead_alert' as const,
    delivery_status: 'delivered',
    created_at: subMinutes(now, 120),
  },

  // Sales Lead Alert - Michael Thompson (Heat Pump)
  {
    direction: 'outbound' as const,
    to_phone: DISPATCHER_PHONE,
    from_phone: TWILIO_FROM,
    body: 'SALES LEAD: Heat Pump Conversion\nCustomer: Michael Thompson\nPhone: (555) 123-4016\nAddress: 6701 Bee Cave Rd, Austin, TX 78746\nNotes: Getting 3 quotes. Interested in rebates + financing.\nScheduled for in-home consultation.\nHigh-value opportunity: $15k+',
    twilio_sid: 'SM_SEED_THOMPSON_005',
    status: 'delivered',
    event_type: 'sales_lead_alert' as const,
    delivery_status: 'delivered',
    created_at: subMinutes(now, 90),
  },

  // Booking Notification - Tony Russo (Commercial Emergency)
  {
    direction: 'outbound' as const,
    to_phone: DISPATCHER_PHONE,
    from_phone: TWILIO_FROM,
    body: 'EMERGENCY BOOKING: Restaurant\nCustomer: Tony Russo - Bella Italia (VIP)\nTime: Today 9:00 AM\nAddress: 2500 Lake Austin Blvd, Austin, TX 78703\nIssue: Walk-in cooler compressor grinding, kitchen 88°F\nValue: $$$ Major Repair\nVIP - Authorize up to $5k',
    twilio_sid: 'SM_SEED_RUSSO_006',
    status: 'delivered',
    event_type: 'booking_notification' as const,
    delivery_status: 'delivered',
    created_at: todayAt(7, 53),
  },

  // Booking Notification - Wei Zhang (Commercial Kitchen)
  {
    direction: 'outbound' as const,
    to_phone: DISPATCHER_PHONE,
    from_phone: TWILIO_FROM,
    body: 'EMERGENCY BOOKING: Commercial Kitchen\nCustomer: Wei Zhang - Golden Dragon\nTime: Today 3:00 PM\nAddress: 9001 N Lamar Blvd, Austin, TX 78753\nIssue: Make-up air unit failed, kitchen too hot\nValue: $$$$ Potential Replacement\nHealth inspection next week',
    twilio_sid: 'SM_SEED_ZHANG_007',
    status: 'delivered',
    event_type: 'booking_notification' as const,
    delivery_status: 'delivered',
    created_at: todayAt(12, 40),
  },

  // Booking Notification - Diana Lawson (Multi-Unit)
  {
    direction: 'outbound' as const,
    to_phone: DISPATCHER_PHONE,
    from_phone: TWILIO_FROM,
    body: 'NEW BOOKING: Property Manager\nCustomer: Diana Lawson - Sunridge Apts (42 units)\nTime: Today 1:00 PM\nAddress: 4200 Manchaca Rd, Austin, TX 78745\nIssue: 3 units down, compressors failing\nValue: $$$ Major Repair + Quote for preventive replacement',
    twilio_sid: 'SM_SEED_LAWSON_008',
    status: 'delivered',
    event_type: 'booking_notification' as const,
    delivery_status: 'delivered',
    created_at: todayAt(9, 15),
  },

  // Abandoned Call Alert
  {
    direction: 'outbound' as const,
    to_phone: DISPATCHER_PHONE,
    from_phone: TWILIO_FROM,
    body: 'MISSED CALL: Customer hung up\nPhone: (555) 999-0002\nDuration: 22 seconds\nSaid: "Hello, I need..."\nNo info collected\nConsider callback attempt',
    twilio_sid: 'SM_SEED_HANGUP_009',
    status: 'delivered',
    event_type: 'abandoned_call' as const,
    delivery_status: 'delivered',
    created_at: todayAt(10, 36),
  },

  // Operator Reply to Robert Chen alert
  {
    direction: 'inbound' as const,
    to_phone: TWILIO_FROM,
    from_phone: DISPATCHER_PHONE,
    body: '1', // Reply code 1 = "En route now"
    twilio_sid: null,
    status: 'received',
    event_type: 'operator_reply' as const,
    delivery_status: null,
    created_at: subMinutes(now, 38),
  },
];

// ============================================
// OPERATOR NOTES (6 records)
// ============================================

export const seedOperatorNotes = [
  // VIP permanent note - Tony Russo (Restaurant)
  {
    customer_phone: '+15551234001',
    customer_name: 'Tony Russo',
    note_text: 'VIP - Owner of Bella Italia (3 locations). Authorize repairs up to $5k without callback. Always needs same-day service. Account in excellent standing.',
    created_by: 'dispatcher@acecooling.com',
    expires_at: null, // Permanent
    is_active: true,
  },

  // VIP permanent note - Diana Lawson (Property Manager)
  {
    customer_phone: '+15551234005',
    customer_name: 'Diana Lawson',
    note_text: 'Property Manager - Sunridge Apartments (42 units). Has maintenance budget authority for repairs up to $3k per unit. Prefers scheduled service windows (9-5 weekdays). Contact for multi-unit discounts.',
    created_by: 'dispatcher@acecooling.com',
    expires_at: null, // Permanent
    is_active: true,
  },

  // Callback complaint history - Robert Chen
  {
    customer_phone: '+15551234003',
    customer_name: 'Robert Chen',
    note_text: 'CALLBACK COMPLAINT: Previous service 2 weeks ago ($450 capacitor replacement) - same issue returned. Customer unhappy, mentioned BBB/Google review. HANDLE WITH CARE. Review work order #WO-2024-1234.',
    created_by: 'AI Assistant',
    expires_at: null,
    is_active: true,
  },

  // Temporary note - Maria Santos (elderly mother)
  {
    customer_phone: '+15551234006',
    customer_name: 'Maria Santos',
    note_text: 'Elderly customer - handle with care. Gate code: 4521. Mother (82) lives with her. If calling, speak clearly and slowly.',
    created_by: 'dispatcher@acecooling.com',
    expires_at: null,
    is_active: true,
  },

  // Temporary note - Amanda Foster (baby)
  {
    customer_phone: '+15551234013',
    customer_name: 'Amanda Foster',
    note_text: 'PRIORITY: 4-month-old baby in home. Emergency AC failure. Prioritize this service call.',
    created_by: 'AI Assistant',
    expires_at: daysFromNowAt(1, 23, 59), // Expires tomorrow
    is_active: true,
  },

  // R-22 follow-up note - Harold Mitchell
  {
    customer_phone: '+15551234007',
    customer_name: 'Harold Mitchell',
    note_text: 'HIGH-VALUE SALES LEAD: R-22 system, 24 years old. Wife recovering from surgery - urgent need for cooling. Open to financing. Competitor quotes expected. Schedule sales consultation ASAP.',
    created_by: 'AI Assistant',
    expires_at: daysFromNowAt(7, 23, 59), // Expires in 1 week
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
