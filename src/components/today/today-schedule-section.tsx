'use client';

import { useState } from 'react';
import { Job } from '@/types/database';
import { format, parseISO, isSameDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { MiniCalendar } from '@/components/ui/mini-calendar';
import DailyTimelineScheduler, { TimelineJob } from '@/components/ui/daily-timeline-scheduler';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { motion } from 'framer-motion';

interface TodayScheduleSectionProps {
  jobs: Job[];
  timezone: string;
  /** Map of date string (yyyy-MM-dd) to job count for the week */
  jobCounts?: Record<string, number>;
}

function formatServiceType(type: string): string {
  if (type === 'hvac') return 'HVAC Services';
  return type.charAt(0).toUpperCase() + type.slice(1) + ' Services';
}

export function TodayScheduleSection({ jobs, timezone, jobCounts = {} }: TodayScheduleSectionProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    router.push(`/schedule?date=${format(date, 'yyyy-MM-dd')}`);
  };

  // Filter jobs for the selected date
  const jobsForSelectedDate = jobs.filter((job) => {
    if (!job.scheduled_at) return false;
    const jobDate = toZonedTime(parseISO(job.scheduled_at), timezone);
    return isSameDay(jobDate, selectedDate);
  });

  // Extract problem type from AI summary
  const extractProblemType = (aiSummary: string | null): string => {
    if (!aiSummary) return "HVAC Service";
    const firstSentence = aiSummary.split(/[.!?]/)[0].trim();
    const cleaned = firstSentence
      .replace(/^(the customer (called|reported|mentioned|said) (about |that )?)/i, '')
      .replace(/^(their |the )/i, '');
    const capitalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    return capitalized.length > 35 ? capitalized.slice(0, 35) + "..." : capitalized;
  };

  // Extract neighborhood from address
  const extractNeighborhood = (address: string | null): string => {
    if (!address) return "";
    const parts = address.split(',').map(p => p.trim());
    if (parts.length >= 2) {
      const neighborhood = parts[1].replace(/\s+(TX|CA|NY|FL)\s*\d*/i, '').trim();
      return neighborhood || parts[0];
    }
    return parts[0];
  };

  // Convert jobs to timeline format
  const timelineJobs: TimelineJob[] = jobsForSelectedDate.map((job) => {
    const scheduledTime = job.scheduled_at
      ? toZonedTime(parseISO(job.scheduled_at), timezone)
      : new Date();
    return {
      id: job.id,
      problemType: extractProblemType(job.ai_summary),
      customerName: job.customer_name,
      phone: job.customer_phone || '',
      neighborhood: extractNeighborhood(job.customer_address),
      scheduledTime,
      address: job.customer_address || '',
    };
  });

  const handleJobClick = (job: TimelineJob) => {
    router.push(`/jobs/${job.id}`);
  };

  // Handle date selection from monthly calendar
  const handleMonthlyDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <CalendarIcon className="w-4 h-4" />
        <span>SCHEDULE</span>
      </div>

      {/* Monthly Calendar - Collapsible */}
      <Collapsible open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <Card className="overflow-hidden">
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                  <CalendarIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Calendar</p>
                  <p className="text-sm text-gray-500">
                    {format(selectedDate, 'MMMM yyyy')}
                  </p>
                </div>
              </div>
              <motion.div
                animate={{ rotate: isCalendarOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-5 h-5 text-gray-400" />
              </motion.div>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t">
              <Calendar
                selected={selectedDate}
                onDateSelect={handleMonthlyDateSelect}
                jobCounts={jobCounts}
              />
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Weekly Calendar Slider */}
      <MiniCalendar
        onSelectDate={handleDateSelect}
        jobCounts={jobCounts}
        selectedDate={selectedDate}
      />

      {/* Daily Timeline */}
      <DailyTimelineScheduler
        jobs={timelineJobs}
        selectedDate={selectedDate}
        onJobClick={handleJobClick}
        startHour={8}
        endHour={18}
      />
    </div>
  );
}
