"use client";

import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Phone, MapPin, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { addDays, format } from "date-fns";

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

interface Customer {
  name: string;
  phone: string;
  address?: string;
  issueDescription: string;
  avatarUrl?: string;
}

interface ServiceSchedulingProps {
  customer: Customer;
  weekSchedule?: DaySchedule[];
  weekRange?: string;
  isLoading?: boolean;
  isBooking?: boolean;
  onTimeSlotSelect?: (day: string, time: string, dateISO: string) => void;
  onWeekChange?: (startDate: Date) => void;
  onConfirmBooking?: (booking: { date: string; time: string; dateISO: string; dateTime: string }) => void;
  onCancel?: () => void;
  enableAnimations?: boolean;
  className?: string;
}

const AVATAR_COLORS = [
  "3b82f6", "8b5cf6", "ec4899", "ef4444", "f97316", "eab308",
  "22c55e", "14b8a6", "06b6d4", "6366f1", "a855f7", "d946ef",
];

const getColorIndex = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % AVATAR_COLORS.length;
};

const getDiceBearAvatarUrl = (name?: string): string => {
  const baseUrl = "https://api.dicebear.com/7.x";
  if (name && name.trim()) {
    const seed = encodeURIComponent(name.trim());
    const bgColor = AVATAR_COLORS[getColorIndex(name.trim())];
    return `${baseUrl}/initials/svg?seed=${seed}&backgroundColor=${bgColor}&textColor=ffffff&fontSize=40&fontWeight=600`;
  }
  return `${baseUrl}/thumbs/svg?seed=anonymous&backgroundColor=e5e7eb&shapeColor=9ca3af`;
};

function parseTimeToDateTime(dateISO: string, timeStr: string): string {
  const [time, period] = timeStr.split(' ');
  const [hours, minutes] = time.split(':').map(Number);
  let hour24 = hours;
  
  if (period === 'PM' && hours !== 12) {
    hour24 = hours + 12;
  } else if (period === 'AM' && hours === 12) {
    hour24 = 0;
  }
  
  const dateTime = new Date(`${dateISO}T${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`);
  return dateTime.toISOString();
}

export function ServiceSchedulingCard({
  customer,
  weekSchedule = [],
  weekRange = "",
  isLoading = false,
  isBooking = false,
  onTimeSlotSelect,
  onWeekChange,
  onConfirmBooking,
  onCancel,
  enableAnimations = true,
  className
}: ServiceSchedulingProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date());
  const [showConfirmationView, setShowConfirmationView] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{
    date: string;
    time: string;
    dayName: string;
    dateISO: string;
  } | null>(null);
  
  const shouldReduceMotion = useReducedMotion();
  const shouldAnimate = enableAnimations && !shouldReduceMotion;

  const handleTimeSlotClick = (day: string, time: string) => {
    const dayInfo = weekSchedule.find(d => d.date === day);
    if (!dayInfo) return;
    
    setSelectedTimeSlot({
      date: day,
      time,
      dayName: dayInfo.dayName,
      dateISO: dayInfo.dateISO,
    });
    setShowConfirmationView(true);
    onTimeSlotSelect?.(day, time, dayInfo.dateISO);
  };

  const handleBackToMain = () => {
    setShowConfirmationView(false);
    setSelectedTimeSlot(null);
  };

  const handleConfirmBooking = () => {
    if (!selectedTimeSlot) return;
    
    const dateTime = parseTimeToDateTime(selectedTimeSlot.dateISO, selectedTimeSlot.time);
    
    onConfirmBooking?.({
      date: selectedTimeSlot.date,
      time: selectedTimeSlot.time,
      dateISO: selectedTimeSlot.dateISO,
      dateTime,
    });
  };

  const handleWeekNavigation = (direction: "prev" | "next") => {
    const newStart = direction === "next" 
      ? addDays(currentWeekStart, 7)
      : addDays(currentWeekStart, -7);
    
    setCurrentWeekStart(newStart);
    onWeekChange?.(newStart);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1,
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 400,
        damping: 28,
      },
    },
  };

  const timeSlotVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 400,
        damping: 25,
      }
    }
  };

  return (
    <motion.div
      variants={shouldAnimate ? containerVariants : {}}
      initial={shouldAnimate ? "hidden" : "visible"}
      animate="visible"
      className={cn(
        "bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden w-full max-w-lg relative",
        className
      )}
    >
      <div className="relative">
        <motion.div
          initial={false}
          animate={{ 
            y: showConfirmationView ? "-20px" : "0px",
            opacity: showConfirmationView ? 0.3 : 1,
            scale: showConfirmationView ? 0.97 : 1,
            filter: showConfirmationView ? "blur(2px)" : "blur(0px)"
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="w-full"
        >
          <motion.div variants={shouldAnimate ? itemVariants : {}} className="p-5 pb-4 border-b border-gray-100">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                <img
                  src={customer.avatarUrl || getDiceBearAvatarUrl(customer.name)}
                  alt={customer.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-gray-900 truncate">
                  {customer.name}
                </h2>
                
                <div className="mt-1 space-y-1">
                  <div className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{customer.phone}</span>
                  </div>
                  {customer.address && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="truncate">{customer.address}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
              <p className="text-sm text-amber-900 line-clamp-2">
                {customer.issueDescription}
              </p>
            </div>
          </motion.div>

          <motion.div variants={shouldAnimate ? itemVariants : {}} className="px-5 py-4">
            <div className="flex items-center justify-between">
              <motion.button
                whileHover={shouldAnimate ? { scale: 1.1 } : {}}
                whileTap={shouldAnimate ? { scale: 0.9 } : {}}
                onClick={() => handleWeekNavigation("prev")}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-500" />
              </motion.button>

              <h3 className="font-semibold text-gray-900">
                {weekRange || "Select a time"}
              </h3>

              <motion.button
                whileHover={shouldAnimate ? { scale: 1.1 } : {}}
                whileTap={shouldAnimate ? { scale: 0.9 } : {}}
                onClick={() => handleWeekNavigation("next")}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-500" />
              </motion.button>
            </div>
          </motion.div>

          <motion.div variants={shouldAnimate ? itemVariants : {}} className="px-5 pb-5">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : weekSchedule.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No availability found
              </div>
            ) : (
              <div className="space-y-4 max-h-[320px] overflow-y-auto">
                {weekSchedule.map((day) => (
                  <motion.div
                    key={day.dateISO}
                    variants={shouldAnimate ? itemVariants : {}}
                    className="space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900 text-sm">
                        {day.dayName}, {day.date}
                      </h4>
                      {!day.hasAvailability && (
                        <span className="text-xs text-gray-400">
                          No availability
                        </span>
                      )}
                    </div>

                    {day.hasAvailability && (
                      <motion.div 
                        variants={shouldAnimate ? containerVariants : {}}
                        className="flex flex-wrap gap-2"
                      >
                        {day.slots.filter(s => s.available).map((slot) => (
                          <motion.button
                            key={`${day.dateISO}-${slot.time}`}
                            variants={shouldAnimate ? timeSlotVariants : {}}
                            whileHover={shouldAnimate ? { scale: 1.05, y: -1 } : {}}
                            whileTap={shouldAnimate ? { scale: 0.98 } : {}}
                            onClick={() => handleTimeSlotClick(day.date, slot.time)}
                            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 text-gray-700 hover:text-blue-700 transition-colors"
                          >
                            {slot.time}
                          </motion.button>
                        ))}
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div variants={shouldAnimate ? itemVariants : {}} className="border-t border-gray-100 p-5">
            <button
              onClick={onCancel}
              className="w-full bg-gray-100 text-gray-700 py-2.5 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Cancel
            </button>
          </motion.div>
        </motion.div>

        <AnimatePresence>
          {showConfirmationView && (
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute inset-0 bg-white"
            >
              <div className="p-5 h-full flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleBackToMain}
                    disabled={isBooking}
                    className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="text-sm font-medium">Back</span>
                  </motion.button>
                  <h3 className="text-lg font-semibold text-gray-900">Confirm Booking</h3>
                  <div className="w-16" />
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl mb-6">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                    <img
                      src={customer.avatarUrl || getDiceBearAvatarUrl(customer.name)}
                      alt={customer.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-gray-900 truncate">{customer.name}</h4>
                    <p className="text-sm text-gray-500 truncate">{customer.phone}</p>
                  </div>
                </div>

                {selectedTimeSlot && (
                  <div className="flex-1 space-y-4">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Appointment Time</p>
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                        <p className="text-lg font-semibold text-gray-900">
                          {selectedTimeSlot.dayName}, {selectedTimeSlot.date}
                        </p>
                        <p className="text-2xl font-bold text-blue-600">
                          {selectedTimeSlot.time}
                        </p>
                      </div>
                    </div>

                    {customer.address && (
                      <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Location</p>
                          <p className="text-sm text-gray-900">{customer.address}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <motion.button
                  whileHover={!isBooking ? { scale: 1.01, y: -1 } : {}}
                  whileTap={!isBooking ? { scale: 0.99 } : {}}
                  onClick={handleConfirmBooking}
                  disabled={isBooking}
                  className="mt-6 w-full relative overflow-hidden py-3.5 rounded-xl font-semibold transition-all bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-400"
                >
                  {isBooking ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Booking...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Check className="w-5 h-5" />
                      Confirm Booking
                    </span>
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
