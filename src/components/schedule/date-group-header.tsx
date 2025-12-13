'use client';

import { toZonedTime, format as formatTz } from 'date-fns-tz';

interface DateGroupHeaderProps {
  date: string; // ISO date string
  timezone: string;
}

export function DateGroupHeader({ date, timezone }: DateGroupHeaderProps) {
  const d = new Date(date);
  const zonedDate = toZonedTime(d, timezone);

  const day = formatTz(zonedDate, 'd', { timeZone: timezone });
  const month = formatTz(zonedDate, 'MMM', { timeZone: timezone }).toUpperCase();
  const dayOfWeek = formatTz(zonedDate, 'EEE', { timeZone: timezone });

  return (
    <div className="flex flex-col items-center text-center w-12 shrink-0 pt-1">
      <span className="text-2xl font-bold text-foreground leading-none">{day}</span>
      <span className="text-[10px] text-muted-foreground uppercase mt-0.5">{month}</span>
      <span className="text-[10px] text-muted-foreground">{dayOfWeek}</span>
    </div>
  );
}
