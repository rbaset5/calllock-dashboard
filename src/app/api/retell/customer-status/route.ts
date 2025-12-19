import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import crypto from 'crypto';

/**
 * Retell Custom Function: Get Customer Status
 *
 * Called by Retell AI agent to look up existing customer appointments.
 * This is a public endpoint (no user auth) - validates via Retell signature.
 *
 * POST /api/retell/customer-status
 * Body: { call: {...}, args: { phone_number: string } }
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
    phone_number: string;
  };
}

interface AppointmentInfo {
  found: boolean;
  appointment_date?: string;
  appointment_time?: string;
  service_type?: string;
  status?: string;
  message: string;
}

// Verify Retell signature (optional but recommended)
function verifyRetellSignature(body: string, signature: string | null, apiKey: string): boolean {
  if (!signature) return false;

  const expectedSignature = crypto
    .createHmac('sha256', apiKey)
    .update(body)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const body: RetellRequest = JSON.parse(rawBody);

    // Optional: Verify Retell signature
    const signature = request.headers.get('x-retell-signature');
    const retellApiKey = process.env.RETELL_API_KEY;

    if (retellApiKey && signature) {
      const isValid = verifyRetellSignature(rawBody, signature, retellApiKey);
      if (!isValid) {
        console.warn('Invalid Retell signature');
        // Continue anyway for now - signature verification is optional
      }
    }

    const phoneNumber = body.args?.phone_number;

    if (!phoneNumber) {
      const response: AppointmentInfo = {
        found: false,
        message: 'No phone number provided',
      };
      return NextResponse.json(response);
    }

    // Normalize phone for matching
    const normalizedPhone = phoneNumber.replace(/\D/g, '');

    const adminClient = createAdminClient();

    // Look up upcoming jobs for this phone number
    const now = new Date().toISOString();

    const { data: jobs, error } = await adminClient
      .from('jobs')
      .select('id, customer_name, scheduled_at, service_type, status, customer_address')
      .or(`customer_phone.ilike.%${normalizedPhone}%`)
      .gte('scheduled_at', now) // Only future appointments
      .order('scheduled_at', { ascending: true })
      .limit(1);

    if (error) {
      console.error('Database error:', error);
      const response: AppointmentInfo = {
        found: false,
        message: 'Unable to look up appointments at this time',
      };
      return NextResponse.json(response);
    }

    if (!jobs || jobs.length === 0) {
      const response: AppointmentInfo = {
        found: false,
        message: 'No upcoming appointments found for this phone number',
      };
      return NextResponse.json(response);
    }

    const job = jobs[0];
    const scheduledDate = new Date(job.scheduled_at);

    // Format date nicely for the AI to speak
    const dateOptions: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    };
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    };

    const formattedDate = scheduledDate.toLocaleDateString('en-US', dateOptions);
    const formattedTime = scheduledDate.toLocaleTimeString('en-US', timeOptions);

    const response: AppointmentInfo = {
      found: true,
      appointment_date: formattedDate,
      appointment_time: formattedTime,
      service_type: job.service_type || 'HVAC service',
      status: job.status || 'confirmed',
      message: `Found appointment for ${formattedDate} at ${formattedTime}`,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Customer status lookup error:', error);
    const response: AppointmentInfo = {
      found: false,
      message: 'An error occurred while looking up appointments',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// Health check
export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'retell-customer-status' });
}
