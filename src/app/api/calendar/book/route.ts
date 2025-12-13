import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const CAL_COM_API_KEY = process.env.CAL_COM_API_KEY;
const CAL_COM_EVENT_TYPE_ID = process.env.CAL_COM_EVENT_TYPE_ID || '3877847';
const CAL_API_BASE = 'https://api.cal.com/v2';

interface BookingRequest {
  dateTime: string;
  customerName: string;
  customerPhone: string;
  serviceAddress?: string;
  problemDescription?: string;
  serviceType?: string;
  urgency?: string;
}

interface CalComBookingResponse {
  status: string;
  data: {
    uid: string;
    title: string;
    startTime: string;
    endTime: string;
  };
}

/**
 * POST /api/calendar/book
 * Creates a booking in Cal.com
 *
 * Body:
 * - dateTime: ISO datetime string
 * - customerName: string
 * - customerPhone: string
 * - serviceAddress: string (optional)
 * - problemDescription: string (optional)
 * - serviceType: string (optional)
 * - urgency: string (optional)
 */
export async function POST(request: NextRequest) {
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

    const body: BookingRequest = await request.json();

    // Validate required fields
    if (!body.dateTime) {
      return NextResponse.json({ error: 'dateTime is required' }, { status: 400 });
    }
    if (!body.customerName) {
      return NextResponse.json({ error: 'customerName is required' }, { status: 400 });
    }
    if (!body.customerPhone) {
      return NextResponse.json({ error: 'customerPhone is required' }, { status: 400 });
    }

    // If Cal.com not configured, return mock booking
    if (!CAL_COM_API_KEY) {
      console.log('Cal.com not configured, returning mock booking');
      const mockUid = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      return NextResponse.json({
        success: true,
        booking_uid: mockUid,
        source: 'mock',
        message: 'Mock booking created (Cal.com not configured)',
      });
    }

    // Create Cal.com booking
    const bookingData = {
      eventTypeId: parseInt(CAL_COM_EVENT_TYPE_ID),
      start: body.dateTime,
      attendee: {
        name: body.customerName,
        email: `${body.customerPhone.replace(/\D/g, '')}@phone.calllock.ai`,
        timeZone: 'America/Chicago',
      },
      metadata: {
        phone: body.customerPhone,
        address: body.serviceAddress || '',
        serviceType: body.serviceType || 'hvac',
        urgency: body.urgency || 'medium',
        problemDescription: body.problemDescription || '',
        bookedBy: 'dashboard_manual',
      },
    };

    console.log('Creating Cal.com booking:', {
      eventTypeId: CAL_COM_EVENT_TYPE_ID,
      dateTime: body.dateTime,
      customerName: body.customerName,
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
      return NextResponse.json({
        error: 'Failed to create booking',
        details: error,
      }, { status: 500 });
    }

    const data = await response.json() as CalComBookingResponse;
    console.log('Cal.com booking created:', data.data.uid);

    // Format confirmation message
    const startTime = new Date(data.data.startTime);
    const dateStr = startTime.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    const timeStr = startTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    return NextResponse.json({
      success: true,
      booking_uid: data.data.uid,
      source: 'calcom',
      message: `Appointment confirmed for ${dateStr} at ${timeStr}`,
      startTime: data.data.startTime,
      endTime: data.data.endTime,
    });
  } catch (error) {
    console.error('Calendar booking error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
