import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const CAL_COM_API_KEY = process.env.CAL_COM_API_KEY;
const CAL_COM_EVENT_TYPE_ID = process.env.CAL_COM_EVENT_TYPE_ID || '3877847';
const CAL_API_BASE = 'https://api.cal.com/v2';

interface CalComSlot {
  time: string;
}

interface CalComSlotsResponse {
  status: string;
  data: {
    slots: Record<string, CalComSlot[]>;
  };
}

export interface TimeSlot {
  time: string;
  label: string;
  isoDateTime: string;
}

/**
 * GET /api/calendar/availability
 * Fetches available time slots from Cal.com for a given date
 *
 * Query params:
 * - date: YYYY-MM-DD format
 * - urgency: 'Emergency' | 'Urgent' | 'Routine' (optional, defaults to 'Routine')
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const cookieStore = await cookies();
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const urgency = searchParams.get('urgency') || 'Routine';

    if (!date) {
      return NextResponse.json({ error: 'date parameter is required' }, { status: 400 });
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'date must be in YYYY-MM-DD format' }, { status: 400 });
    }

    // If Cal.com not configured, return mock slots
    if (!CAL_COM_API_KEY) {
      console.log('Cal.com not configured, returning mock slots');
      return NextResponse.json({
        slots: generateMockSlots(date),
        source: 'mock',
      });
    }

    // Fetch from Cal.com
    const startTime = new Date(`${date}T00:00:00`).toISOString();
    const endTime = new Date(`${date}T23:59:59`).toISOString();

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
      console.error('Cal.com API error:', response.status, error);
      return NextResponse.json({
        error: 'Failed to fetch availability',
        slots: [],
        source: 'error',
      }, { status: 500 });
    }

    const data = await response.json() as CalComSlotsResponse;

    // Convert Cal.com slots to our format
    const slots: TimeSlot[] = [];

    if (data.data?.slots) {
      for (const [dateStr, daySlots] of Object.entries(data.data.slots)) {
        for (const slot of daySlots) {
          const slotDate = new Date(slot.time);
          slots.push({
            time: slot.time,
            label: formatTime(slotDate),
            isoDateTime: slot.time,
          });
        }
      }
    }

    // Sort by time
    slots.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    return NextResponse.json({
      slots,
      source: 'calcom',
      date,
    });
  } catch (error) {
    console.error('Calendar availability error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Format time to human readable string
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Generate mock slots for development/testing
 */
function generateMockSlots(date: string): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const baseDate = new Date(`${date}T00:00:00`);

  // Generate slots from 8 AM to 5 PM
  const hours = [8, 9, 10, 11, 13, 14, 15, 16, 17]; // Skip noon

  for (const hour of hours) {
    const slotDate = new Date(baseDate);
    slotDate.setHours(hour, 0, 0, 0);

    slots.push({
      time: slotDate.toISOString(),
      label: formatTime(slotDate),
      isoDateTime: slotDate.toISOString(),
    });
  }

  return slots;
}
