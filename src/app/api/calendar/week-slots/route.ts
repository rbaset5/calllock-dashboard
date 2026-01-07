import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { format, addDays, startOfDay } from 'date-fns';

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
  available: boolean;
}

export interface DaySchedule {
  date: string;
  dateISO: string;
  dayName: string;
  dayNumber: number;
  slots: TimeSlot[];
  hasAvailability: boolean;
}

function formatTimeLabel(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function getDayName(date: Date, today: Date): string {
  const dayDiff = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (dayDiff === 0) return 'Today';
  if (dayDiff === 1) return 'Tomorrow';
  return format(date, 'EEE');
}

function generateMockSlotsForDay(date: Date): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const hours = [9, 10, 11, 12, 13, 14, 15, 16];
  const dayOfWeek = date.getDay();
  
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return [];
  }
  
  for (const hour of hours) {
    for (const minute of [0, 30]) {
      const slotDate = new Date(date);
      slotDate.setHours(hour, minute, 0, 0);
      const available = Math.random() > 0.3;
      
      slots.push({
        time: formatTimeLabel(slotDate),
        available,
      });
    }
  }
  
  return slots;
}

export async function GET(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('start');
    
    const today = startOfDay(new Date());
    const startDate = startDateParam ? startOfDay(new Date(startDateParam)) : today;
    const endDate = addDays(startDate, 6);

    const weekRange = `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d')}`;

    if (!CAL_COM_API_KEY) {
      console.log('Cal.com not configured, returning mock week slots');
      
      const weekSchedule: DaySchedule[] = [];
      for (let i = 0; i < 7; i++) {
        const dayDate = addDays(startDate, i);
        const slots = generateMockSlotsForDay(dayDate);
        
        weekSchedule.push({
          date: format(dayDate, 'MMM d'),
          dateISO: format(dayDate, 'yyyy-MM-dd'),
          dayName: getDayName(dayDate, today),
          dayNumber: dayDate.getDate(),
          slots,
          hasAvailability: slots.some(s => s.available),
        });
      }
      
      return NextResponse.json({
        weekSchedule,
        weekRange,
        source: 'mock',
      });
    }

    const startTime = startDate.toISOString();
    const endTime = addDays(endDate, 1).toISOString();

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
        weekSchedule: [],
        source: 'error',
      }, { status: 500 });
    }

    const data = await response.json() as CalComSlotsResponse;

    const slotsByDate: Record<string, TimeSlot[]> = {};
    
    if (data.data?.slots) {
      for (const [, daySlots] of Object.entries(data.data.slots)) {
        for (const slot of daySlots) {
          const slotDate = new Date(slot.time);
          const dateKey = format(slotDate, 'yyyy-MM-dd');
          
          if (!slotsByDate[dateKey]) {
            slotsByDate[dateKey] = [];
          }
          
          slotsByDate[dateKey].push({
            time: formatTimeLabel(slotDate),
            available: true,
          });
        }
      }
    }

    const weekSchedule: DaySchedule[] = [];
    for (let i = 0; i < 7; i++) {
      const dayDate = addDays(startDate, i);
      const dateKey = format(dayDate, 'yyyy-MM-dd');
      const slots = slotsByDate[dateKey] || [];
      
      slots.sort((a, b) => {
        const timeA = new Date(`1970-01-01 ${a.time}`).getTime();
        const timeB = new Date(`1970-01-01 ${b.time}`).getTime();
        return timeA - timeB;
      });
      
      weekSchedule.push({
        date: format(dayDate, 'MMM d'),
        dateISO: dateKey,
        dayName: getDayName(dayDate, today),
        dayNumber: dayDate.getDate(),
        slots,
        hasAvailability: slots.length > 0,
      });
    }

    return NextResponse.json({
      weekSchedule,
      weekRange,
      source: 'calcom',
    });
  } catch (error) {
    console.error('Calendar week slots error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
