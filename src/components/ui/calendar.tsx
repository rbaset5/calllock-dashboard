"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  hasBooking: boolean;
}

interface CalendarProps {
  initialDate?: Date;
  selected?: Date;
  onDateSelect?: (date: Date) => void;
  showSelectedDateInfo?: boolean;
  className?: string;
  maxWidth?: string;
  /** Map of date string (yyyy-MM-dd) to job count for showing booking dots */
  jobCounts?: Record<string, number>;
}

const Calendar: React.FC<CalendarProps> = ({
  initialDate = new Date(),
  selected,
  onDateSelect,
  showSelectedDateInfo = false,
  className = "",
  maxWidth = "",
  jobCounts = {},
}) => {
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [internalSelectedDate, setInternalSelectedDate] = useState<Date | null>(null);

  // Use controlled selected prop if provided, otherwise use internal state
  const selectedDate = selected || internalSelectedDate;

  // Create a Set of date strings that have bookings for fast lookup
  const bookingDates = useMemo(() => {
    return new Set(
      Object.entries(jobCounts)
        .filter(([, count]) => count > 0)
        .map(([dateStr]) => dateStr)
    );
  }, [jobCounts]);

  const getDaysInMonth = (date: Date): CalendarDay[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days: CalendarDay[] = [];
    const today = new Date();

    for (let i = 0; i < 42; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateStr = format(currentDate, "yyyy-MM-dd");

      days.push({
        date: currentDate,
        isCurrentMonth: currentDate.getMonth() === month,
        isToday: currentDate.toDateString() === today.toDateString(),
        isSelected: selectedDate
          ? currentDate.toDateString() === selectedDate.toDateString()
          : false,
        hasBooking: bookingDates.has(dateStr),
      });
    }

    return days;
  };

  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  const prevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  const handleDateClick = (date: Date) => {
    setInternalSelectedDate(date);
    onDateSelect?.(date);
  };

  const days = getDaysInMonth(currentDate);
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "bg-white rounded-2xl p-4 sm:p-6 w-full",
        maxWidth,
        className
      )}
    >
      {/* Header */}
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center justify-between mb-6"
      >
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={prevMonth}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </motion.button>

        <motion.h2
          key={currentDate.getMonth()}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-lg font-semibold text-gray-800"
        >
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </motion.h2>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={nextMonth}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </motion.button>
      </motion.div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
          <div
            key={day}
            className="p-2 text-center text-xs font-medium text-gray-500"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        <AnimatePresence mode="popLayout">
          {days.map((day, index) => (
            <motion.button
              key={`${day.date.toDateString()}-${index}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.005 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleDateClick(day.date)}
              className={cn(
                "relative aspect-square flex items-center justify-center rounded-lg text-sm transition-all duration-150",
                day.isCurrentMonth
                  ? "text-gray-800 hover:bg-blue-50"
                  : "text-gray-300",
                day.isToday && !day.isSelected
                  ? "bg-blue-500 text-white hover:bg-blue-600 font-semibold"
                  : "",
                day.isSelected
                  ? "bg-blue-600 text-white hover:bg-blue-700 font-semibold"
                  : ""
              )}
            >
              {day.date.getDate()}
              {/* Booking indicator dot */}
              {day.hasBooking && !day.isToday && !day.isSelected && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-500" />
              )}
              {day.hasBooking && (day.isToday || day.isSelected) && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white" />
              )}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {/* Selected Date Info */}
      {showSelectedDateInfo && selectedDate && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-3 bg-gray-50 rounded-lg"
        >
          <p className="text-sm text-gray-600">
            Selected:{" "}
            {selectedDate.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};

Calendar.displayName = "Calendar";

export { Calendar };
export default Calendar;
