import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const CAL_COM_API_KEY = process.env.CAL_COM_API_KEY;
const DASHBOARD_USER_EMAIL = process.env.DASHBOARD_USER_EMAIL || 'rashid.baset@gmail.com';
const CAL_COM_EVENT_TYPE_ID = process.env.CAL_COM_EVENT_TYPE_ID || '3877847';
const CAL_API_BASE = 'https://api.cal.com/v2';

/**
 * Retell Custom Function: Book Service
 *
 * Combined tool that checks availability and books in one step.
 * This prevents the agent from "checking" without actually booking.
 *
 * POST /api/retell/book-service
 * Body: { call: {...}, args: { customer_name, customer_phone, preferred_time, issue_description, service_address? } }
 */

interface RetellRequest {
  call: {
    call_id: string;
    agent_id: string;
    from_number?: string;
    to_number?: string;
    metadata?: Record<string, unknown>;
    retell_llm_dynamic_variables?: Record<string, string>;
  };
  args: {
    customer_name: string;
    customer_phone: string;
    service_address?: string;
    preferred_time: string;  // "Monday 9am", "tomorrow morning", "soonest available"
    issue_description: string;
  };
}

interface BookServiceResponse {
  success: boolean;
  booked: boolean;
  appointment_date?: string;
  appointment_time?: string;
  message: string;
  available_slots?: string[];
}

interface CalComSlot {
  time: string;
}

interface CalComSlotsResponse {
  status: string;
  data: {
    slots: Record<string, CalComSlot[]>;
  };
}

interface CalComBookingResponse {
  status: string;
  data: {
    id: number;
    uid: string;
    title: string;
    start: string;  // Cal.com v2 API uses 'start' not 'startTime'
    end: string;    // Cal.com v2 API uses 'end' not 'endTime'
  };
}

/**
 * Parse natural language time preferences into date ranges
 */
function parsePreferredTime(preferredTime: string): { startDate: Date; endDate: Date; specificHour?: number } {
  const now = new Date();
  const lowerTime = preferredTime.toLowerCase();

  // Default: next 7 days
  let startDate = new Date(now);
  let endDate = new Date(now);
  endDate.setDate(endDate.getDate() + 7);
  let specificHour: number | undefined;

  // "soonest", "earliest", "first available"
  if (lowerTime.includes('soonest') || lowerTime.includes('earliest') || lowerTime.includes('first available') || lowerTime.includes('asap')) {
    // Keep default - next 7 days, will pick first slot
    return { startDate, endDate };
  }

  // "tomorrow"
  if (lowerTime.includes('tomorrow')) {
    startDate = new Date(now);
    startDate.setDate(startDate.getDate() + 1);
    startDate.setHours(0, 0, 0, 0);

    endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);
  }

  // Day of week: Monday, Tuesday, etc.
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let i = 0; i < days.length; i++) {
    if (lowerTime.includes(days[i])) {
      const targetDay = i;
      const currentDay = now.getDay();
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0) daysUntil += 7; // Next week if today or past

      startDate = new Date(now);
      startDate.setDate(startDate.getDate() + daysUntil);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);
      break;
    }
  }

  // "morning" - 6am to 12pm
  if (lowerTime.includes('morning')) {
    startDate.setHours(6, 0, 0, 0);
    endDate.setHours(12, 0, 0, 0);
  }

  // "afternoon" - 12pm to 6pm
  if (lowerTime.includes('afternoon')) {
    startDate.setHours(12, 0, 0, 0);
    endDate.setHours(18, 0, 0, 0);
  }

  // Specific hour: "9am", "10 am", "2pm", "3 pm"
  const hourMatch = lowerTime.match(/(\d{1,2})\s*(am|pm)/i);
  if (hourMatch) {
    let hour = parseInt(hourMatch[1]);
    const isPM = hourMatch[2].toLowerCase() === 'pm';
    if (isPM && hour < 12) hour += 12;
    if (!isPM && hour === 12) hour = 0;
    specificHour = hour;
  }

  // "next week"
  if (lowerTime.includes('next week')) {
    // Start from next Monday
    const currentDay = now.getDay();
    const daysUntilMonday = currentDay === 0 ? 1 : 8 - currentDay;
    startDate = new Date(now);
    startDate.setDate(startDate.getDate() + daysUntilMonday);
    startDate.setHours(0, 0, 0, 0);

    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 4); // Monday to Friday
    endDate.setHours(23, 59, 59, 999);
  }

  return { startDate, endDate, specificHour };
}

/**
 * Fetch available slots from Cal.com
 */
async function getAvailableSlots(startDate: Date, endDate: Date): Promise<CalComSlot[]> {
  const startTime = startDate.toISOString();
  const endTime = endDate.toISOString();

  const url = `${CAL_API_BASE}/slots/available?startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}&eventTypeId=${CAL_COM_EVENT_TYPE_ID}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${CAL_COM_API_KEY}`,
      'cal-api-version': '2024-08-13',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Cal.com availability error:', response.status, error);
    throw new Error('Failed to fetch availability');
  }

  const data = await response.json() as CalComSlotsResponse;

  // Flatten slots from all days
  const allSlots: CalComSlot[] = [];
  if (data.data?.slots) {
    for (const daySlots of Object.values(data.data.slots)) {
      allSlots.push(...daySlots);
    }
  }

  // Sort by time
  allSlots.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  return allSlots;
}

/**
 * Create a booking in Cal.com
 */
async function createBooking(
  slotTime: string,
  customerName: string,
  customerPhone: string,
  serviceAddress: string,
  issueDescription: string
): Promise<CalComBookingResponse> {
  const bookingData = {
    eventTypeId: parseInt(CAL_COM_EVENT_TYPE_ID),
    start: slotTime,
    attendee: {
      name: customerName,
      email: `${customerPhone.replace(/\D/g, '') || 'caller'}@phone.calllock.ai`,
      timeZone: 'America/Chicago',
    },
    metadata: {
      phone: customerPhone,
      address: serviceAddress,
      serviceType: 'hvac',
      problemDescription: issueDescription,
      bookedBy: 'retell_ai_agent',
    },
  };

  console.log('Creating Cal.com booking:', {
    eventTypeId: CAL_COM_EVENT_TYPE_ID,
    slotTime,
    customerName,
    customerPhone: customerPhone.substring(0, 6) + '...',
  });

  const response = await fetch(`${CAL_API_BASE}/bookings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${CAL_COM_API_KEY}`,
      'cal-api-version': '2024-08-13',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bookingData),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Cal.com booking error:', response.status, error);
    throw new Error('Failed to create booking');
  }

  return await response.json() as CalComBookingResponse;
}

/**
 * Format a date for speech
 */
function formatDateForSpeech(date: Date): { date: string; time: string } {
  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return { date: dateStr, time: timeStr };
}

/**
 * Format slots as readable alternatives
 */
function formatAlternatives(slots: CalComSlot[], maxSlots: number = 3): string[] {
  return slots.slice(0, maxSlots).map(slot => {
    const date = new Date(slot.time);
    const { date: dateStr, time: timeStr } = formatDateForSpeech(date);
    return `${dateStr} at ${timeStr}`;
  });
}

export async function POST(request: NextRequest) {
  try {
    const body: RetellRequest = await request.json();

    const {
      customer_name,
      customer_phone: argPhone,
      service_address = 'TBD',
      preferred_time,
      issue_description,
    } = body.args || {};

    // Use caller ID from Retell if phone is TBD or missing
    const customer_phone = (argPhone && argPhone !== 'TBD') 
      ? argPhone 
      : body.call?.from_number || 'unknown';

    // Validate required fields (phone now comes from caller ID)
    if (!customer_name || !preferred_time || !issue_description) {
      const response: BookServiceResponse = {
        success: false,
        booked: false,
        message: 'I need your name, preferred time, and a brief description of the issue to book.',
      };
      return NextResponse.json(response);
    }

    // If Cal.com not configured, return mock booking
    if (!CAL_COM_API_KEY) {
      console.log('Cal.com not configured, returning mock booking');
      const mockDate = new Date();
      mockDate.setDate(mockDate.getDate() + 1);
      mockDate.setHours(9, 0, 0, 0);

      const { date: dateStr, time: timeStr } = formatDateForSpeech(mockDate);

      const response: BookServiceResponse = {
        success: true,
        booked: true,
        appointment_date: dateStr,
        appointment_time: timeStr,
        message: `Booked for ${dateStr} at ${timeStr}. Tech will call 30 minutes before.`,
      };
      return NextResponse.json(response);
    }

    // Parse preferred time to date range
    const { startDate, endDate, specificHour } = parsePreferredTime(preferred_time);

    console.log('Parsed time preference:', {
      preferred_time,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      specificHour,
    });

    // Fetch available slots
    const slots = await getAvailableSlots(startDate, endDate);

    if (slots.length === 0) {
      // No slots available in requested range - expand search
      const expandedEnd = new Date(startDate);
      expandedEnd.setDate(expandedEnd.getDate() + 14);

      const expandedSlots = await getAvailableSlots(startDate, expandedEnd);

      if (expandedSlots.length === 0) {
        const response: BookServiceResponse = {
          success: true,
          booked: false,
          message: "I'm not finding any openings right now. Let me have someone call you back to figure out a time.",
        };
        return NextResponse.json(response);
      }

      // Offer alternatives
      const alternatives = formatAlternatives(expandedSlots);
      const response: BookServiceResponse = {
        success: true,
        booked: false,
        available_slots: alternatives,
        message: `That time's not available, but I've got ${alternatives[0]}${alternatives.length > 1 ? ` or ${alternatives[1]}` : ''}. Would either of those work?`,
      };
      return NextResponse.json(response);
    }

    // Find best matching slot
    let selectedSlot = slots[0]; // Default to first available

    if (specificHour !== undefined) {
      // Try to find slot at specific hour
      const matchingSlot = slots.find(slot => {
        const slotHour = new Date(slot.time).getHours();
        return slotHour === specificHour;
      });
      if (matchingSlot) {
        selectedSlot = matchingSlot;
      }
    }

    // Book the appointment
    const booking = await createBooking(
      selectedSlot.time,
      customer_name,
      customer_phone,
      service_address,
      issue_description
    );

    const appointmentDate = new Date(booking.data.start);
    const { date: dateStr, time: timeStr } = formatDateForSpeech(appointmentDate);

    console.log('Booking created:', {
      uid: booking.data.uid,
      start: booking.data.start,
      customerName: customer_name,
    });

    // Create job in Supabase for dashboard display
    try {
      const supabase = createAdminClient();

      // Find user by email
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('email', DASHBOARD_USER_EMAIL)
        .single();

      if (user) {
        // Check for existing job with same call_id (deduplication)
        const callId = body.call?.call_id;
        let existingJob = null;

        if (callId) {
          const { data: existing } = await supabase
            .from('jobs')
            .select('id')
            .eq('user_id', user.id)
            .eq('original_call_id', callId)
            .single();
          existingJob = existing;
        }

        if (existingJob) {
          // Update existing job
          await supabase
            .from('jobs')
            .update({
              scheduled_at: booking.data.start,
              customer_name: customer_name,
              customer_phone: customer_phone,
              customer_address: service_address,
              ai_summary: issue_description,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingJob.id);

          console.log('Updated existing job:', existingJob.id);
        } else {
          // Create new job
          const { data: job, error: jobError } = await supabase
            .from('jobs')
            .insert({
              user_id: user.id,
              customer_name: customer_name,
              customer_phone: customer_phone,
              customer_address: service_address,
              service_type: 'hvac',
              urgency: 'medium',
              scheduled_at: booking.data.start,
              is_ai_booked: true,
              status: 'new',
              original_call_id: callId || null,
              ai_summary: issue_description,
            })
            .select('id')
            .single();

          if (jobError) {
            console.error('Failed to create job in Supabase:', jobError);
          } else {
            console.log('Job created in Supabase:', job?.id);
          }
        }
      } else {
        console.warn('User not found for email:', DASHBOARD_USER_EMAIL);
      }
    } catch (dbError) {
      // Don't fail the booking if database insert fails
      console.error('Database error (non-fatal):', dbError);
    }

    const response: BookServiceResponse = {
      success: true,
      booked: true,
      appointment_date: dateStr,
      appointment_time: timeStr,
      message: `You're all set for ${dateStr} at ${timeStr}. Our tech will give you a call about 30 minutes before they head over.`,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Book service error:', error);
    const response: BookServiceResponse = {
      success: false,
      booked: false,
      message: "Hmm, the system's being a little finicky. Let me have someone call you back to get you scheduled.",
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// Health check
export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'retell-book-service' });
}
