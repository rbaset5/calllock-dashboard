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

// SMS message templates
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

// Format service type for SMS
export function formatServiceTypeForSms(type: string): string {
  if (type === 'hvac') return 'HVAC';
  return type.charAt(0).toUpperCase() + type.slice(1);
}
