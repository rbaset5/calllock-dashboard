"use client";

import * as React from "react";
import {
  format,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isToday,
  isSameDay,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface MiniCalendarProps {
  onSelectDate?: (date: Date) => void;
  selectedDate?: Date;
  /** Map of date string (yyyy-MM-dd) to job count */
  jobCounts?: Record<string, number>;
}

export const MiniCalendar: React.FC<MiniCalendarProps> = ({
  onSelectDate,
  selectedDate: controlledSelectedDate,
  jobCounts = {},
}) => {
  const [internalSelectedDate, setInternalSelectedDate] = React.useState<Date>(new Date());
  const [currentWeek, setCurrentWeek] = React.useState<Date>(new Date());
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

  return (
    <div
      className="bg-white rounded-xl border border-gray-100 shadow-sm p-3"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header: Month + Navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h2 className="text-sm font-semibold text-gray-900">
          {format(currentWeek, "MMMM yyyy")}
        </h2>
        <button
          onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Horizontal Week Strip */}
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

              {/* Job Count Dots */}
              {jobCount > 0 && (
                <div className="flex gap-0.5 mt-1">
                  {Array.from({ length: Math.min(jobCount, 3) }).map((_, i) => (
                    <span
                      key={i}
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        isSelected ? "bg-white/70" : "bg-blue-500"
                      )}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
