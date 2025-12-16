"use client";

import * as React from "react";
import {
  format,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  getDay,
  isToday,
  isSameDay,
  isSameMonth,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import DailyTimelineScheduler, { TimelineJob } from "./daily-timeline-scheduler";

interface MiniCalendarProps {
  onSelectDate?: (date: Date) => void;
  selectedDate?: Date;
  /** Map of date string (yyyy-MM-dd) to job count */
  jobCounts?: Record<string, number>;
  /** Jobs to display in timeline for selected date */
  jobs?: TimelineJob[];
  /** Callback when a job is clicked in the timeline */
  onJobClick?: (job: TimelineJob) => void;
}

export const MiniCalendar: React.FC<MiniCalendarProps> = ({
  onSelectDate,
  selectedDate: controlledSelectedDate,
  jobCounts = {},
  jobs = [],
  onJobClick,
}) => {
  const [internalSelectedDate, setInternalSelectedDate] = React.useState<Date>(new Date());
  const [currentWeek, setCurrentWeek] = React.useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = React.useState<Date>(new Date());
  const [viewMode, setViewMode] = React.useState<'week' | 'month'>('week');
  const [touchStart, setTouchStart] = React.useState<number | null>(null);

  const selectedDate = controlledSelectedDate ?? internalSelectedDate;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        // Swipe left → next week
        setCurrentWeek(addWeeks(currentWeek, 1));
      } else {
        // Swipe right → previous week
        setCurrentWeek(subWeeks(currentWeek, 1));
      }
    }
    setTouchStart(null);
  };

  const weekDays = eachDayOfInterval({
    start: startOfWeek(currentWeek, { weekStartsOn: 0 }),
    end: endOfWeek(currentWeek, { weekStartsOn: 0 }),
  });

  const handleDateClick = (day: Date) => {
    setInternalSelectedDate(day);
    onSelectDate?.(day);
  };

  // Filter jobs for the selected date
  const filteredJobs = React.useMemo(() => {
    return jobs.filter((job) => isSameDay(job.scheduledTime, selectedDate));
  }, [jobs, selectedDate]);

  return (
    <div
      className="bg-white rounded-xl border border-gray-100 shadow-sm p-3"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header: Navigation + Month + View Toggle */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => {
            if (viewMode === 'week') {
              setCurrentWeek(subWeeks(currentWeek, 1));
            } else {
              setCurrentMonth(subMonths(currentMonth, 1));
            }
          }}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <h2 className="text-sm font-semibold text-gray-900">
          {format(viewMode === 'week' ? currentWeek : currentMonth, "MMMM yyyy")}
        </h2>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('week')}
              className={cn(
                "px-2 py-1 text-xs font-medium rounded-md transition-colors",
                viewMode === 'week'
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={cn(
                "px-2 py-1 text-xs font-medium rounded-md transition-colors",
                viewMode === 'month'
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              Month
            </button>
          </div>

          <button
            onClick={() => {
              if (viewMode === 'week') {
                setCurrentWeek(addWeeks(currentWeek, 1));
              } else {
                setCurrentMonth(addMonths(currentMonth, 1));
              }
            }}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Weekly View */}
      {viewMode === 'week' && (
        <div className="flex justify-between">
          {weekDays.map((day) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const isSelected = isSameDay(day, selectedDate);
            const today = isToday(day);
            const jobCount = jobCounts[dateKey] || 0;

            return (
              <button
                key={day.toString()}
                onClick={() => handleDateClick(day)}
                className={cn(
                  "flex flex-col items-center py-2 px-2.5 rounded-lg transition-colors min-w-[44px]",
                  isSelected
                    ? "bg-gray-900 text-white"
                    : today
                    ? "bg-blue-50 text-blue-700"
                    : "hover:bg-gray-50 text-gray-700"
                )}
              >
                {/* Day of Week */}
                <span className={cn(
                  "text-xs font-medium mb-1",
                  isSelected ? "text-gray-300" : "text-gray-500"
                )}>
                  {format(day, "EEE")}
                </span>

                {/* Date Number */}
                <span className={cn(
                  "text-lg font-semibold",
                  isSelected ? "text-white" : today ? "text-blue-700" : "text-gray-900"
                )}>
                  {format(day, "d")}
                </span>

                {/* Job Indicator Dot */}
                {jobCount > 0 && (
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full mt-1",
                      isSelected ? "bg-white/70" : "bg-blue-500"
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Monthly View */}
      {viewMode === 'month' && (
        <div>
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 mb-1">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <div key={i} className="text-center text-xs font-medium text-gray-500 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before month starts */}
            {Array.from({ length: getDay(startOfMonth(currentMonth)) }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {/* Month days */}
            {eachDayOfInterval({
              start: startOfMonth(currentMonth),
              end: endOfMonth(currentMonth),
            }).map((day) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const isSelected = isSameDay(day, selectedDate);
              const today = isToday(day);
              const jobCount = jobCounts[dateKey] || 0;

              return (
                <button
                  key={day.toString()}
                  onClick={() => handleDateClick(day)}
                  className={cn(
                    "aspect-square flex flex-col items-center justify-center rounded-lg transition-colors text-sm",
                    isSelected
                      ? "bg-gray-900 text-white"
                      : today
                      ? "bg-blue-50 text-blue-700"
                      : "hover:bg-gray-50 text-gray-700"
                  )}
                >
                  <span className={cn(
                    "font-medium",
                    isSelected ? "text-white" : today ? "text-blue-700" : "text-gray-900"
                  )}>
                    {format(day, "d")}
                  </span>

                  {/* Job Indicator Dot */}
                  {jobCount > 0 && (
                    <span
                      className={cn(
                        "w-1 h-1 rounded-full mt-0.5",
                        isSelected ? "bg-white/70" : "bg-blue-500"
                      )}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Daily Timeline - Shows jobs for selected date */}
      {filteredJobs.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <DailyTimelineScheduler
            jobs={filteredJobs}
            selectedDate={selectedDate}
            onJobClick={onJobClick}
          />
        </div>
      )}
    </div>
  );
};
