import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  parseTimeFromSMS,
  parseSnoozeFromSMS,
  generateBookingConfirmation,
  generateSnoozeConfirmation,
} from '@/lib/sms-time-parser';

describe('sms-time-parser', () => {
  // Use a fixed date for consistent testing
  const mockDate = new Date('2024-12-20T10:00:00.000Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('parseTimeFromSMS', () => {
    describe('empty input', () => {
      it('should return needsClarification for empty string', () => {
        const result = parseTimeFromSMS('');
        expect(result.success).toBe(false);
        expect(result.needsClarification).toBe(true);
      });

      it('should return needsClarification for whitespace', () => {
        const result = parseTimeFromSMS('   ');
        expect(result.success).toBe(false);
        expect(result.needsClarification).toBe(true);
      });
    });

    describe('relative days', () => {
      it('should parse TODAY with time', () => {
        const result = parseTimeFromSMS('TODAY 2PM');
        expect(result.success).toBe(true);
        expect(result.dateTime).toBeDefined();
        expect(result.dateTime!.getHours()).toBe(14);
        expect(result.dateTime!.getMinutes()).toBe(0);
      });

      it('should parse TODAY with minutes', () => {
        const result = parseTimeFromSMS('TODAY 2:30PM');
        expect(result.success).toBe(true);
        expect(result.dateTime!.getHours()).toBe(14);
        expect(result.dateTime!.getMinutes()).toBe(30);
      });

      it('should request clarification for TODAY without time', () => {
        const result = parseTimeFromSMS('TODAY');
        expect(result.success).toBe(false);
        expect(result.needsClarification).toBe(true);
        expect(result.clarificationPrompt).toContain('What time today');
      });

      it('should parse TOMORROW with time', () => {
        const result = parseTimeFromSMS('TOMORROW 9AM');
        expect(result.success).toBe(true);
        expect(result.dateTime!.getHours()).toBe(9);
      });

      it('should parse TOMORROW without time (default 9AM)', () => {
        const result = parseTimeFromSMS('TOMORROW');
        expect(result.success).toBe(true);
        expect(result.dateTime!.getHours()).toBe(9);
      });

      it('should parse TMRW shorthand', () => {
        const result = parseTimeFromSMS('TMRW 3PM');
        expect(result.success).toBe(true);
        expect(result.dateTime!.getHours()).toBe(15);
      });

      it('should parse TMR shorthand', () => {
        const result = parseTimeFromSMS('TMR 10AM');
        expect(result.success).toBe(true);
        expect(result.dateTime!.getHours()).toBe(10);
      });
    });

    describe('day of week', () => {
      it('should parse MON', () => {
        const result = parseTimeFromSMS('MON 2PM');
        expect(result.success).toBe(true);
        expect(result.dateTime!.getDay()).toBe(1); // Monday
        expect(result.dateTime!.getHours()).toBe(14);
      });

      it('should parse TUESDAY', () => {
        const result = parseTimeFromSMS('TUE 10:30AM');
        expect(result.success).toBe(true);
        expect(result.dateTime!.getDay()).toBe(2); // Tuesday
        expect(result.dateTime!.getHours()).toBe(10);
        expect(result.dateTime!.getMinutes()).toBe(30);
      });

      it('should parse day without time (default 9AM)', () => {
        const result = parseTimeFromSMS('WED');
        expect(result.success).toBe(true);
        expect(result.dateTime!.getDay()).toBe(3); // Wednesday
        expect(result.dateTime!.getHours()).toBe(9);
      });

      it('should parse NEXT MONDAY', () => {
        const result = parseTimeFromSMS('NEXT MONDAY 3PM');
        expect(result.success).toBe(true);
        expect(result.dateTime!.getDay()).toBe(1); // Monday
        expect(result.dateTime!.getHours()).toBe(15);
      });

      it('should parse FRI', () => {
        const result = parseTimeFromSMS('FRI 4PM');
        expect(result.success).toBe(true);
        expect(result.dateTime!.getDay()).toBe(5); // Friday
        expect(result.dateTime!.getHours()).toBe(16);
      });
    });

    describe('explicit dates', () => {
      it('should parse MM/DD format', () => {
        const result = parseTimeFromSMS('12/25 2PM');
        expect(result.success).toBe(true);
        expect(result.dateTime!.getMonth()).toBe(11); // December (0-indexed)
        expect(result.dateTime!.getDate()).toBe(25);
        expect(result.dateTime!.getHours()).toBe(14);
      });

      it('should parse MM-DD format', () => {
        const result = parseTimeFromSMS('1-15 9AM');
        expect(result.success).toBe(true);
        expect(result.dateTime!.getMonth()).toBe(0); // January
        expect(result.dateTime!.getDate()).toBe(15);
        expect(result.dateTime!.getHours()).toBe(9);
      });

      it('should parse date without time (default 9AM)', () => {
        const result = parseTimeFromSMS('12/30');
        expect(result.success).toBe(true);
        expect(result.dateTime!.getHours()).toBe(9);
      });
    });

    describe('time only', () => {
      it('should parse 2PM', () => {
        const result = parseTimeFromSMS('2PM');
        expect(result.success).toBe(true);
        expect(result.dateTime!.getHours()).toBe(14);
      });

      it('should parse 10:30AM', () => {
        const result = parseTimeFromSMS('10:30AM');
        expect(result.success).toBe(true);
        expect(result.dateTime!.getHours()).toBe(10);
        expect(result.dateTime!.getMinutes()).toBe(30);
      });

      it('should parse 24-hour format', () => {
        const result = parseTimeFromSMS('14:00');
        expect(result.success).toBe(true);
        expect(result.dateTime!.getHours()).toBe(14);
      });

      it('should handle 12PM (noon)', () => {
        const result = parseTimeFromSMS('12PM');
        expect(result.success).toBe(true);
        expect(result.dateTime!.getHours()).toBe(12);
      });

      it('should handle 12AM (midnight)', () => {
        const result = parseTimeFromSMS('12AM');
        expect(result.success).toBe(true);
        expect(result.dateTime!.getHours()).toBe(0);
      });
    });

    describe('presets', () => {
      it('should parse ASAP (1 hour from now)', () => {
        const result = parseTimeFromSMS('ASAP');
        expect(result.success).toBe(true);
        expect(result.dateTime).toBeDefined();
      });

      it('should parse NOW', () => {
        const result = parseTimeFromSMS('NOW');
        expect(result.success).toBe(true);
      });

      it('should parse MORNING (9 AM)', () => {
        const result = parseTimeFromSMS('MORNING');
        expect(result.success).toBe(true);
        expect(result.dateTime!.getHours()).toBe(9);
      });

      it('should parse AFTERNOON (2 PM)', () => {
        const result = parseTimeFromSMS('AFTERNOON');
        expect(result.success).toBe(true);
        expect(result.dateTime!.getHours()).toBe(14);
      });

      it('should parse EVENING (5 PM)', () => {
        const result = parseTimeFromSMS('EVENING');
        expect(result.success).toBe(true);
        expect(result.dateTime!.getHours()).toBe(17);
      });
    });

    describe('case insensitivity', () => {
      it('should parse lowercase', () => {
        const result = parseTimeFromSMS('tomorrow 2pm');
        expect(result.success).toBe(true);
      });

      it('should parse mixed case', () => {
        const result = parseTimeFromSMS('Tomorrow 2PM');
        expect(result.success).toBe(true);
      });
    });

    describe('invalid input', () => {
      it('should return clarification for unrecognized input', () => {
        const result = parseTimeFromSMS('xyz123');
        expect(result.success).toBe(false);
        expect(result.needsClarification).toBe(true);
      });

      it('should return clarification for random text', () => {
        const result = parseTimeFromSMS('hello world');
        expect(result.success).toBe(false);
        expect(result.needsClarification).toBe(true);
      });
    });
  });

  describe('parseSnoozeFromSMS', () => {
    describe('hours', () => {
      it('should parse 1H', () => {
        const result = parseSnoozeFromSMS('1H');
        expect(result.success).toBe(true);
        expect(result.displayText).toBe('1 hour');
      });

      it('should parse 3H', () => {
        const result = parseSnoozeFromSMS('3H');
        expect(result.success).toBe(true);
        expect(result.displayText).toBe('3 hours');
      });

      it('should parse 2 HOURS', () => {
        const result = parseSnoozeFromSMS('2 HOURS');
        expect(result.success).toBe(true);
        expect(result.displayText).toBe('2 hours');
      });

      it('should parse single digit shorthand', () => {
        const result = parseSnoozeFromSMS('3');
        expect(result.success).toBe(true);
        expect(result.displayText).toBe('3 hours');
      });
    });

    describe('minutes', () => {
      it('should parse 30M', () => {
        const result = parseSnoozeFromSMS('30M');
        expect(result.success).toBe(true);
        expect(result.displayText).toBe('30 minutes');
      });

      it('should parse 15 MIN', () => {
        const result = parseSnoozeFromSMS('15 MIN');
        expect(result.success).toBe(true);
        expect(result.displayText).toBe('15 minutes');
      });

      it('should reject too short duration', () => {
        const result = parseSnoozeFromSMS('5M');
        expect(result.success).toBe(false);
      });
    });

    describe('tomorrow', () => {
      it('should parse TOMORROW', () => {
        const result = parseSnoozeFromSMS('TOMORROW');
        expect(result.success).toBe(true);
        expect(result.displayText).toBe('Tomorrow at 9 AM');
      });

      it('should parse TMRW', () => {
        const result = parseSnoozeFromSMS('TMRW');
        expect(result.success).toBe(true);
      });

      it('should parse TOMORROW AM', () => {
        const result = parseSnoozeFromSMS('TOMORROW AM');
        expect(result.success).toBe(true);
        expect(result.displayText).toBe('Tomorrow at 9 AM');
      });

      it('should parse TOMORROW PM', () => {
        const result = parseSnoozeFromSMS('TOMORROW PM');
        expect(result.success).toBe(true);
        expect(result.displayText).toBe('Tomorrow at 2 PM');
      });
    });

    describe('invalid input', () => {
      it('should return error for invalid format', () => {
        const result = parseSnoozeFromSMS('invalid');
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should reject excessive hours', () => {
        const result = parseSnoozeFromSMS('48H');
        expect(result.success).toBe(false);
      });
    });
  });

  describe('generateBookingConfirmation', () => {
    it('should generate confirmation message', () => {
      const date = new Date('2024-12-21T14:00:00');
      const result = generateBookingConfirmation('John Smith', date);

      expect(result).toContain('John Smith');
      expect(result).toContain('Added to your calendar');
    });
  });

  describe('generateSnoozeConfirmation', () => {
    it('should generate snooze confirmation message', () => {
      const snoozeUntil = new Date('2024-12-21T09:00:00');
      const result = generateSnoozeConfirmation('John Smith', snoozeUntil);

      expect(result).toContain('Snoozed: John Smith');
      expect(result).toContain('Reminder:');
    });
  });
});
