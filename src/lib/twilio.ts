import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const fromNumber = process.env.TWILIO_PHONE_NUMBER!;

// Create Twilio client (only on server side)
export function getTwilioClient() {
  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials not configured');
  }
  return twilio(accountSid, authToken);
}

export async function sendSMS(to: string, body: string): Promise<string | null> {
  try {
    const client = getTwilioClient();
    const message = await client.messages.create({
      body,
      to,
      from: fromNumber,
    });
    return message.sid;
  } catch (error) {
    console.error('Error sending SMS:', error);
    return null;
  }
}

// SMS message templates (legacy)
export const smsTemplates = {
  newJob: (
    serviceType: string,
    customerName: string,
    dateTime: string,
    link: string
  ) => `New job: ${serviceType} - ${customerName} - ${dateTime}. Open: ${link}`,

  reminder1Hour: (serviceType: string, address: string) =>
    `Reminder: ${serviceType} at ${address} in 1 hour`,

  staleNeedsAction: (customerName: string, link: string) =>
    `Job needs attention: ${customerName}. Reply COMPLETE if done, or tap: ${link}`,

  completeConfirmation: (customerName: string) =>
    `Job for ${customerName} marked complete. Great work!`,
};

// New notification templates (glanceable, under 160 chars)
export const notificationTemplates = {
  // Same-day booking: urgent, needs confirmation
  sameDayBooking: (name: string, time: string, service: string, city: string) =>
    `CALLLOCK: New booking TODAY\n${name} \u00B7 ${time}\n${service}${city ? ` \u00B7 ${city}` : ''}\nReply OK to confirm`,

  // Future booking: informational
  futureBooking: (name: string, date: string, time: string, service: string) =>
    `CALLLOCK: Booking ${date}\n${name} \u00B7 ${time}\n${service}\nView in app`,

  // Callback request: customer waiting
  callbackRequest: (name: string, timeframe: string) =>
    `CALLLOCK: Callback requested\n${name} wants callback ${timeframe}\nReply CALL for number`,

  // Schedule conflict: needs resolution
  scheduleConflict: (name: string, time: string, existingJob: string) =>
    `CALLLOCK: Conflict!\n${name} at ${time}\nConflicts with ${existingJob}\nReview in app`,

  // Same-day cancellation: slot freed up
  cancellation: (name: string, time: string) =>
    `CALLLOCK: Cancel\n${name} \u00B7 ${time} slot open`,

  // Abandoned call: customer hung up - needs immediate callback
  abandonedCall: (name: string, phone: string) =>
    `CALLLOCK: Hung up\n${name} \u00B7 ${phone}\nCall back ASAP`,

  // Stale job alert: job sitting too long without action
  staleJobAlert: (name: string, hoursWaiting: number) =>
    `CALLLOCK: Stale job!\n${name} waiting ${hoursWaiting}h\nNeeds attention`,

  // Reply confirmations
  confirmBooking: (name: string) => `Confirmed: ${name}. Good luck!`,

  customerPhone: (name: string, phone: string) => `${name}: ${phone}`,
};

// Format service type for SMS
export function formatServiceTypeForSms(type: string): string {
  if (type === 'hvac') return 'HVAC';
  return type.charAt(0).toUpperCase() + type.slice(1);
}
