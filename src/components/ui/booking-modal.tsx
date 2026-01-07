"use client";

import { useState, useEffect, useCallback } from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { cn } from "@/lib/utils";
import { ServiceSchedulingCard, DaySchedule } from "./service-scheduling-card";
import { TileCardData } from "./expandable-tile-card";
import { format, startOfDay } from "date-fns";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: TileCardData | null;
  onSuccess?: () => void;
}

export function BookingModal({ isOpen, onClose, card, onSuccess }: BookingModalProps) {
  const [weekSchedule, setWeekSchedule] = useState<DaySchedule[]>([]);
  const [weekRange, setWeekRange] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfDay(new Date()));

  const fetchWeekSlots = useCallback(async (startDate: Date) => {
    setIsLoading(true);
    try {
      const dateStr = format(startDate, 'yyyy-MM-dd');
      const response = await fetch(`/api/calendar/week-slots?start=${dateStr}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch slots');
      }
      
      const data = await response.json();
      setWeekSchedule(data.weekSchedule || []);
      setWeekRange(data.weekRange || "");
    } catch (error) {
      console.error('Error fetching week slots:', error);
      setWeekSchedule([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && card) {
      const today = startOfDay(new Date());
      setCurrentWeekStart(today);
      fetchWeekSlots(today);
    }
  }, [isOpen, card, fetchWeekSlots]);

  const handleWeekChange = (startDate: Date) => {
    setCurrentWeekStart(startDate);
    fetchWeekSlots(startDate);
  };

  const handleConfirmBooking = async (booking: { 
    date: string; 
    time: string; 
    dateISO: string; 
    dateTime: string;
  }) => {
    if (!card?.leadId) {
      console.error('No lead ID available for booking');
      return;
    }

    setIsBooking(true);
    try {
      const response = await fetch(`/api/leads/${card.leadId}/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateTime: booking.dateTime,
          date: booking.date,
          time: booking.time,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to book appointment');
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Booking error:', error);
    } finally {
      setIsBooking(false);
    }
  };

  if (!card) return null;

  const customer = {
    name: card.author || 'Unknown Customer',
    phone: card.phone || 'No phone',
    address: card.address,
    issueDescription: card.preview || 'Service request',
    avatarUrl: undefined,
  };

  return (
    <DrawerPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Overlay className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm" />
        <DrawerPrimitive.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-[130] mt-24 flex flex-col rounded-t-2xl bg-gray-50",
            "max-h-[90vh] outline-none"
          )}
        >
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-gray-300" />
          
          <div className="flex-1 overflow-y-auto p-4 pb-safe">
            <ServiceSchedulingCard
              customer={customer}
              weekSchedule={weekSchedule}
              weekRange={weekRange}
              isLoading={isLoading}
              isBooking={isBooking}
              onWeekChange={handleWeekChange}
              onConfirmBooking={handleConfirmBooking}
              onCancel={onClose}
              className="mx-auto"
            />
          </div>
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  );
}
