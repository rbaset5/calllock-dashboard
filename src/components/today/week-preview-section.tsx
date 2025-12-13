'use client';

import { MiniCalendar } from '@/components/ui/mini-calendar';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

export function WeekPreviewSection() {
  const router = useRouter();

  const handleDateSelect = (date: Date) => {
    router.push(`/schedule?date=${format(date, 'yyyy-MM-dd')}`);
  };

  return (
    <div className="space-y-2">
      <MiniCalendar onSelectDate={handleDateSelect} />
    </div>
  );
}
