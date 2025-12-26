/**
 * Shared types for scheduling components
 */

export interface TimeSlot {
  time: string;
  label: string;
  isoDateTime: string;
}

export interface CustomerInfo {
  name: string;
  phone: string;
  address: string;
  serviceType?: string;
  urgency?: string;
  notes?: string;
}

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'asap' | null;

export interface TimePreference {
  timeOfDay: TimeOfDay;
  specificDay: string | null;
  displayText: string | null;
}
