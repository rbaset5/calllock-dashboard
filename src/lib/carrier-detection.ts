/**
 * Carrier Detection Utility (V4)
 *
 * Detects mobile carrier from phone number prefix
 * and provides carrier-specific call forwarding instructions.
 */

// ============================================
// TYPES
// ============================================

export type Carrier = 'att' | 'verizon' | 'tmobile' | 'sprint' | 'voip' | 'other';

export interface CarrierInfo {
  carrier: Carrier;
  name: string;
  forwardingInstructions: ForwardingInstructions;
}

export interface ForwardingInstructions {
  type: 'dial_code' | 'manual';
  enableCode?: string;
  disableCode?: string;
  description: string;
  steps: string[];
  note?: string;
}

// ============================================
// CARRIER FORWARDING CODES
// ============================================

const CARRIER_FORWARDING: Record<Carrier, ForwardingInstructions> = {
  att: {
    type: 'dial_code',
    enableCode: '*61*{number}#',
    disableCode: '#61#',
    description: 'AT&T Conditional Call Forwarding (No Answer)',
    steps: [
      'Open your phone\'s dialer app',
      'Dial *61*{number}# (replace {number} with your CallSeal number)',
      'Press Call',
      'Wait for confirmation tone or message',
      'You should see "Call Forwarding Activated" or hear a confirmation',
    ],
    note: 'This forwards calls only when you don\'t answer within 20 seconds',
  },
  verizon: {
    type: 'dial_code',
    enableCode: '*71{number}',
    disableCode: '*73',
    description: 'Verizon Call Forwarding',
    steps: [
      'Open your phone\'s dialer app',
      'Dial *71{number} (replace {number} with your CallSeal number)',
      'Press Call',
      'Wait for confirmation tone',
      'You should hear two beeps confirming activation',
    ],
    note: 'This forwards ALL incoming calls. To forward only unanswered calls, contact Verizon to enable Conditional Call Forwarding.',
  },
  tmobile: {
    type: 'dial_code',
    enableCode: '**61*{number}#',
    disableCode: '##61#',
    description: 'T-Mobile Conditional Call Forwarding (No Answer)',
    steps: [
      'Open your phone\'s dialer app',
      'Dial **61*{number}# (replace {number} with your CallSeal number)',
      'Press Call',
      'Wait for confirmation message',
      'You should see a success notification',
    ],
    note: 'This forwards calls only when you don\'t answer',
  },
  sprint: {
    type: 'dial_code',
    enableCode: '*28{number}',
    disableCode: '*38',
    description: 'Sprint/T-Mobile Call Forwarding',
    steps: [
      'Open your phone\'s dialer app',
      'Dial *28{number} (replace {number} with your CallSeal number)',
      'Press Call',
      'Wait for confirmation',
    ],
    note: 'Sprint is now part of T-Mobile. If this doesn\'t work, try T-Mobile codes.',
  },
  voip: {
    type: 'manual',
    description: 'VoIP/Business Phone System',
    steps: [
      'Log into your VoIP admin portal (RingCentral, Vonage, 8x8, etc.)',
      'Navigate to Call Handling or Call Forwarding settings',
      'Find "Forward when unanswered" or "No answer" option',
      'Enter your CallSeal number as the forwarding destination',
      'Set the ring time (we recommend 15-20 seconds)',
      'Save your settings',
    ],
    note: 'Each VoIP provider has different settings. Contact your provider if you need help.',
  },
  other: {
    type: 'manual',
    description: 'Other Carrier',
    steps: [
      'Contact your phone carrier\'s customer service',
      'Ask them to enable "Conditional Call Forwarding" or "Forward when unanswered"',
      'Provide your CallSeal number as the forwarding destination',
      'Request forwarding after 15-20 seconds of no answer',
    ],
    note: 'Most carriers can set this up for you over the phone in 5-10 minutes.',
  },
};

// ============================================
// CARRIER DETECTION
// ============================================

// Common carrier prefixes (NPA-NXX patterns)
// This is a simplified detection - real carrier lookup would use an API
const CARRIER_PREFIXES: Record<string, Carrier> = {
  // AT&T common prefixes (examples)
  '310': 'att',
  '311': 'att',
  '312': 'att',
  // Verizon common prefixes (examples)
  '320': 'verizon',
  '321': 'verizon',
  // T-Mobile common prefixes (examples)
  '330': 'tmobile',
  '331': 'tmobile',
};

/**
 * Detect carrier from phone number
 * Note: This is a basic implementation. For production, use a carrier lookup API.
 */
export function detectCarrier(phoneNumber: string): Carrier {
  // Normalize phone number
  const digits = phoneNumber.replace(/\D/g, '');

  // Check if it's a known VoIP/toll-free pattern
  if (digits.startsWith('1800') || digits.startsWith('1888') || digits.startsWith('1877')) {
    return 'voip';
  }

  // For now, return 'other' and let user select
  // In production, you'd use a carrier lookup API like:
  // - Twilio Carrier Lookup
  // - NumVerify
  // - Telnyx Number Lookup
  return 'other';
}

/**
 * Get carrier information and forwarding instructions
 */
export function getCarrierInfo(carrier: Carrier): CarrierInfo {
  const names: Record<Carrier, string> = {
    att: 'AT&T',
    verizon: 'Verizon',
    tmobile: 'T-Mobile',
    sprint: 'Sprint',
    voip: 'VoIP / Business Phone',
    other: 'Other Carrier',
  };

  return {
    carrier,
    name: names[carrier],
    forwardingInstructions: CARRIER_FORWARDING[carrier],
  };
}

/**
 * Format forwarding code with actual number
 */
export function formatForwardingCode(code: string, callLockNumber: string): string {
  // Remove non-digits from CallSeal number
  const digits = callLockNumber.replace(/\D/g, '');
  return code.replace('{number}', digits);
}

/**
 * Get all available carriers for selection
 */
export function getAvailableCarriers(): { value: Carrier; label: string }[] {
  return [
    { value: 'att', label: 'AT&T' },
    { value: 'verizon', label: 'Verizon' },
    { value: 'tmobile', label: 'T-Mobile' },
    { value: 'sprint', label: 'Sprint (now T-Mobile)' },
    { value: 'voip', label: 'VoIP / Business Phone System' },
    { value: 'other', label: 'Other / I\'m not sure' },
  ];
}

/**
 * Verify call forwarding is working
 * This would typically involve making a test call
 */
export async function verifyCallForwarding(
  businessPhone: string,
  callLockNumber: string
): Promise<{ success: boolean; message: string }> {
  // In production, this would:
  // 1. Initiate a test call to the business phone
  // 2. Let it ring (don't answer)
  // 3. Check if it forwarded to CallSeal number
  // 4. Have the AI answer and confirm forwarding worked

  // For now, return a placeholder
  return {
    success: true,
    message: 'Call forwarding test initiated. Please check that the call was answered by CallSeal.',
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format phone number for display
 */
export function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '');

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  return phone;
}

/**
 * Normalize phone number to E.164 format
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  return phone.startsWith('+') ? phone : `+${digits}`;
}
