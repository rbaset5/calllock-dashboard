import { addDays, addHours, setHours, setMinutes, subMinutes, startOfDay } from 'date-fns';

// Phone prefix for seed data identification
export const SEED_PHONE_PREFIX = '+1555';

// Helper to create dates relative to now
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

// ============================================
// CUSTOMERS
// ============================================
export const seedCustomers = [
  {
    name: 'John Martinez',
    phone: '+15551234001',
    email: 'john.martinez@email.com',
    address: '123 Oak Street, Houston, TX 77001',
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
    address: '456 Pine Avenue, Houston, TX 77002',
    equipment: [
      { type: 'Heat Pump', brand: 'Trane', model: 'XR15', year: 2021, location: 'Side yard' }
    ],
    notes: 'Works from home. Text before arriving.',
  },
  {
    name: 'Mike Williams',
    phone: '+15551234003',
    email: null,
    address: '789 Elm Drive, Houston, TX 77003',
    equipment: [
      { type: 'Central AC', brand: 'Rheem', model: 'RA1636AJ1NA', year: 2018, location: 'Roof' }
    ],
    notes: 'Annual maintenance customer since 2020.',
  },
  {
    name: 'Lisa Chen',
    phone: '+15551234004',
    email: 'lisa.chen@email.com',
    address: '321 Maple Lane, Houston, TX 77004',
    equipment: [
      { type: 'Furnace', brand: 'Goodman', model: 'GMVC960803BN', year: 2017, location: 'Attic' }
    ],
    notes: null,
  },
  {
    name: 'Robert Davis',
    phone: '+15551234005',
    email: 'rdavis@email.com',
    address: '654 Cedar Court, Houston, TX 77005',
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
    address: '987 Birch Way, Houston, TX 77006',
    equipment: [
      { type: 'Central AC', brand: 'Carrier', model: 'Infinity 26', year: 2022, location: 'Side of house' }
    ],
    notes: 'New customer. Referred by John Martinez.',
  },
];

// ============================================
// JOBS
// ============================================
export const seedJobs = [
  // Today's jobs
  {
    customer_name: 'John Martinez',
    customer_phone: '+15551234001',
    customer_address: '123 Oak Street, Houston, TX 77001',
    service_type: 'hvac' as const,
    urgency: 'high' as const,
    status: 'en_route' as const,
    scheduled_at: todayAt(9, 0),
    estimated_value: 350,
    ai_summary: 'AC not cooling properly - compressor making grinding noise. Customer says it started yesterday.',
    travel_started_at: subMinutes(now, 12),
    is_ai_booked: false,
    booking_confirmed: true,
  },
  {
    customer_name: 'Sarah Johnson',
    customer_phone: '+15551234002',
    customer_address: '456 Pine Avenue, Houston, TX 77002',
    service_type: 'hvac' as const,
    urgency: 'medium' as const,
    status: 'on_site' as const,
    scheduled_at: todayAt(10, 30),
    estimated_value: 180,
    ai_summary: 'Scheduled heat pump maintenance - annual checkup.',
    started_at: subMinutes(now, 18),
    travel_started_at: subMinutes(now, 35),
    is_ai_booked: true,
    booking_confirmed: true,
  },
  {
    customer_name: 'Mike Williams',
    customer_phone: '+15551234003',
    customer_address: '789 Elm Drive, Houston, TX 77003',
    service_type: 'hvac' as const,
    urgency: 'low' as const,
    status: 'confirmed' as const,
    scheduled_at: todayAt(13, 0),
    estimated_value: 150,
    ai_summary: 'Annual AC tune-up - routine maintenance.',
    is_ai_booked: false,
    booking_confirmed: true,
  },
  {
    customer_name: 'Lisa Chen',
    customer_phone: '+15551234004',
    customer_address: '321 Maple Lane, Houston, TX 77004',
    service_type: 'hvac' as const,
    urgency: 'medium' as const,
    status: 'confirmed' as const,
    scheduled_at: todayAt(15, 0),
    estimated_value: 200,
    ai_summary: 'Furnace inspection - customer smelled something burning last week.',
    is_ai_booked: true,
    booking_confirmed: false, // Needs review
  },
  {
    customer_name: 'Robert Davis',
    customer_phone: '+15551234005',
    customer_address: '654 Cedar Court, Houston, TX 77005',
    service_type: 'hvac' as const,
    urgency: 'high' as const,
    status: 'new' as const,
    scheduled_at: todayAt(17, 0),
    estimated_value: 400,
    ai_summary: 'AC unit making loud rattling noise. Wants same-day service.',
    is_ai_booked: true,
    booking_confirmed: false, // Needs review
  },
  // Tomorrow's jobs
  {
    customer_name: 'Jennifer Brown',
    customer_phone: '+15551234006',
    customer_address: '987 Birch Way, Houston, TX 77006',
    service_type: 'hvac' as const,
    urgency: 'low' as const,
    status: 'confirmed' as const,
    scheduled_at: tomorrowAt(9, 0),
    estimated_value: 175,
    ai_summary: 'New customer - AC efficiency check and filter replacement.',
    is_ai_booked: false,
    booking_confirmed: true,
  },
  {
    customer_name: 'John Martinez',
    customer_phone: '+15551234001',
    customer_address: '123 Oak Street, Houston, TX 77001',
    service_type: 'hvac' as const,
    urgency: 'medium' as const,
    status: 'confirmed' as const,
    scheduled_at: tomorrowAt(14, 0),
    estimated_value: 250,
    ai_summary: 'Follow-up on previous repair - verify AC compressor fix.',
    is_ai_booked: false,
    booking_confirmed: true,
  },
  // This week's jobs
  {
    customer_name: 'Amanda Peters',
    customer_phone: '+15551234007',
    customer_address: '111 Willow Street, Houston, TX 77007',
    service_type: 'hvac' as const,
    urgency: 'emergency' as const,
    status: 'confirmed' as const,
    scheduled_at: daysFromNowAt(2, 8, 0),
    estimated_value: 600,
    ai_summary: 'No AC - elderly customer, health concern. Priority service.',
    is_ai_booked: false,
    booking_confirmed: true,
  },
  {
    customer_name: 'Tom Anderson',
    customer_phone: '+15551234008',
    customer_address: '222 Spruce Blvd, Houston, TX 77008',
    service_type: 'hvac' as const,
    urgency: 'low' as const,
    status: 'new' as const,
    scheduled_at: daysFromNowAt(3, 10, 0),
    estimated_value: 150,
    ai_summary: 'Seasonal maintenance - prepare AC for summer.',
    is_ai_booked: true,
    booking_confirmed: false,
  },
  {
    customer_name: 'Nancy Clark',
    customer_phone: '+15551234009',
    customer_address: '333 Aspen Road, Houston, TX 77009',
    service_type: 'hvac' as const,
    urgency: 'medium' as const,
    status: 'confirmed' as const,
    scheduled_at: daysFromNowAt(4, 11, 0),
    estimated_value: 300,
    ai_summary: 'Thermostat replacement and system diagnostic.',
    is_ai_booked: false,
    booking_confirmed: true,
  },
  {
    customer_name: 'Steve Miller',
    customer_phone: '+15551234010',
    customer_address: '444 Poplar Lane, Houston, TX 77010',
    service_type: 'hvac' as const,
    urgency: 'high' as const,
    status: 'confirmed' as const,
    scheduled_at: daysFromNowAt(5, 9, 0),
    estimated_value: 450,
    ai_summary: 'Ductwork inspection - uneven cooling throughout house.',
    is_ai_booked: false,
    booking_confirmed: true,
  },
  // Completed job (yesterday)
  {
    customer_name: 'Karen White',
    customer_phone: '+15551234011',
    customer_address: '555 Hickory Drive, Houston, TX 77011',
    service_type: 'hvac' as const,
    urgency: 'medium' as const,
    status: 'complete' as const,
    scheduled_at: daysFromNowAt(-1, 10, 0),
    completed_at: daysFromNowAt(-1, 11, 45),
    estimated_value: 275,
    revenue: 285,
    ai_summary: 'Refrigerant recharge and coil cleaning.',
    is_ai_booked: false,
    booking_confirmed: true,
  },
];

// ============================================
// LEADS
// ============================================
export const seedLeads = [
  {
    customer_name: 'David Kim',
    customer_phone: '+15551235001',
    customer_address: '100 Main Street, Houston, TX 77012',
    status: 'callback_requested' as const,
    priority: 'hot' as const,
    why_not_booked: 'Wanted to check prices with spouse first',
    issue_description: 'AC unit not blowing cold air. Thinks it might need refrigerant.',
    service_type: 'hvac' as const,
    urgency: 'high' as const,
    estimated_value: 350,
    callback_requested_at: subMinutes(now, 120),
    ai_summary: 'Customer called about AC not cooling. Seemed interested but wanted to confirm budget with spouse. Requested callback in 2 hours.',
  },
  {
    customer_name: 'Amanda White',
    customer_phone: '+15551235002',
    customer_address: '200 Second Avenue, Houston, TX 77013',
    status: 'callback_requested' as const,
    priority: 'hot' as const,
    why_not_booked: 'Needs to check work schedule',
    issue_description: 'Furnace not igniting. Gets error code on thermostat.',
    service_type: 'hvac' as const,
    urgency: 'high' as const,
    estimated_value: 400,
    callback_requested_at: subMinutes(now, 45),
    ai_summary: 'Urgent furnace issue but customer at work. Asked to call back after 5pm to schedule for tomorrow.',
  },
  {
    customer_name: 'Chris Taylor',
    customer_phone: '+15551235003',
    customer_address: '300 Third Street, Houston, TX 77014',
    status: 'thinking' as const,
    priority: 'warm' as const,
    why_not_booked: 'Getting other quotes first',
    issue_description: 'Wants full system replacement quote.',
    service_type: 'hvac' as const,
    urgency: 'low' as const,
    estimated_value: 8000,
    ai_summary: 'Customer shopping for new HVAC system. Current unit is 15 years old. Getting 3 quotes before deciding.',
  },
  {
    customer_name: 'Emily Garcia',
    customer_phone: '+15551235004',
    customer_address: '400 Fourth Boulevard, Houston, TX 77015',
    status: 'voicemail_left' as const,
    priority: 'warm' as const,
    why_not_booked: 'No answer - left voicemail',
    issue_description: 'Missed call - returned call went to voicemail.',
    service_type: 'hvac' as const,
    urgency: 'medium' as const,
    estimated_value: 250,
    ai_summary: 'Inbound call disconnected. Called back but no answer. Left voicemail asking them to call back.',
  },
  {
    customer_name: 'James Wilson',
    customer_phone: '+15551235005',
    customer_address: '500 Fifth Lane, Houston, TX 77016',
    status: 'deferred' as const,
    priority: 'cold' as const,
    why_not_booked: 'Not ready yet - call back next week',
    issue_description: 'Interested in preventive maintenance plan.',
    service_type: 'hvac' as const,
    urgency: 'low' as const,
    estimated_value: 200,
    remind_at: tomorrowAt(9, 0),
    ai_summary: 'Customer interested in maintenance plan but traveling this week. Asked to be called Monday morning.',
  },
  {
    customer_name: 'Michelle Lee',
    customer_phone: '+15551235006',
    customer_address: '600 Sixth Court, Houston, TX 77017',
    status: 'thinking' as const,
    priority: 'warm' as const,
    why_not_booked: 'Landlord needs to approve repair',
    issue_description: 'AC making noise but tenant needs landlord approval for service.',
    service_type: 'hvac' as const,
    urgency: 'medium' as const,
    estimated_value: 300,
    ai_summary: 'Rental property - tenant called about noisy AC. Waiting for landlord to approve service call.',
  },
];

// ============================================
// AI BOOKING REVIEWS (created after jobs)
// ============================================
export function createAIBookingReviews(jobs: Array<{ id: string; scheduled_at: Date; is_ai_booked: boolean; booking_confirmed: boolean }>, userId: string) {
  return jobs
    .filter(job => job.is_ai_booked && !job.booking_confirmed)
    .map(job => ({
      user_id: userId,
      job_id: job.id,
      status: 'pending' as const,
      original_scheduled_at: job.scheduled_at,
    }));
}
