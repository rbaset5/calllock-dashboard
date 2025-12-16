'use client';

import { ChevronDown, Calendar } from 'lucide-react';
import * as Collapsible from '@radix-ui/react-collapsible';
import { useState } from 'react';
import { Job } from '@/types/database';
import { TodayAppointmentItem } from './today-appointment-item';
import { cn } from '@/lib/utils';

interface TodaySectionProps {
  jobs: Job[];
}

export function TodaySection({ jobs }: TodaySectionProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (jobs.length === 0) {
    return null;
  }

  return (
    <Collapsible.Root open={isOpen} onOpenChange={setIsOpen} className="mt-6">
      {/* Section Header */}
      <Collapsible.Trigger asChild>
        <button className="flex items-center justify-between w-full py-2 group">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-navy-400" />
            <span className="text-sm font-semibold text-navy-600">
              Today ({jobs.length})
            </span>
          </div>
          <ChevronDown
            className={cn(
              'w-5 h-5 text-navy-400 transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
          />
        </button>
      </Collapsible.Trigger>

      {/* Jobs List */}
      <Collapsible.Content className="mt-3">
        <div className="pl-1">
          {jobs.map((job, index) => (
            <TodayAppointmentItem
              key={job.id}
              job={job}
              isFirst={index === 0}
              isLast={index === jobs.length - 1}
            />
          ))}
        </div>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
