"use client";

import * as React from "react";
import { formatDateRange } from "little-date";
import { PlusIcon, Map } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { CalendarOriginUI } from "@/components/ui/calendar-originui";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

export interface EventSlot {
  id: string;
  title: string;
  from: Date;
  to: Date;
  category?: string;
  author?: string;
  address?: string;
  phone?: string;
}

interface CalendarWithEventSlotsProps {
  events: EventSlot[];
  initialDate?: Date;
  onAddEvent?: () => void;
  onEventClick?: (event: EventSlot) => void;
  onMapClick?: () => void;
  className?: string;
}

function EventDots({ count }: { count: number }) {
  const dotCount = Math.min(count, 3);
  if (dotCount === 0) return null;
  
  return (
    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
      {Array.from({ length: dotCount }).map((_, i) => (
        <span
          key={i}
          className="w-1 h-1 bg-blue-500 rounded-full"
        />
      ))}
    </div>
  );
}

export function CalendarWithEventSlots({
  events,
  initialDate,
  onAddEvent,
  onEventClick,
  onMapClick,
  className,
}: CalendarWithEventSlotsProps) {
  const [date, setDate] = React.useState<Date | undefined>(
    initialDate ?? new Date()
  );

  const selectedDateEvents = React.useMemo(() => {
    if (!date) return [];
    const selectedDateStr = date.toDateString();
    return events.filter((event) => {
      const eventDate = new Date(event.from);
      return eventDate.toDateString() === selectedDateStr;
    });
  }, [date, events]);

  const eventCountByDate = React.useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach((event) => {
      const dateKey = format(new Date(event.from), "yyyy-MM-dd");
      counts[dateKey] = (counts[dateKey] || 0) + 1;
    });
    return counts;
  }, [events]);

  const CustomDayButton = React.useCallback(
    (props: React.ButtonHTMLAttributes<HTMLButtonElement> & { day: { date: Date }; modifiers: unknown }) => {
      const { day, modifiers, children, className: dayClassName, ...rest } = props;
      const dateKey = format(day.date, "yyyy-MM-dd");
      const count = eventCountByDate[dateKey] || 0;
      
      return (
        <button className={cn(dayClassName, "relative")} {...rest}>
          {children}
          <EventDots count={count} />
        </button>
      );
    },
    [eventCountByDate]
  );

  return (
    <Card className={cn("relative", className)}>
      <div className="absolute top-5 right-5 flex items-center gap-1 z-10">
        {onMapClick && (
          <button
            onClick={onMapClick}
            className="p-1.5 rounded-md hover:bg-black/5 transition-colors text-gray-500"
          >
            <Map size={20} />
          </button>
        )}
      </div>
      <CardContent className="px-4 pt-4">
        <CalendarOriginUI
          mode="single"
          selected={date}
          onSelect={setDate}
          className="bg-transparent p-0"
          components={{ DayButton: CustomDayButton }}
          required
        />
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-3 border-t px-4 !pt-4">
        <div className="flex w-full items-center justify-between px-1">
          <div className="text-sm font-medium">
            {date?.toLocaleDateString("en-US", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </div>
          {onAddEvent && (
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              title="Add Event"
              onClick={onAddEvent}
            >
              <PlusIcon className="size-4" />
              <span className="sr-only">Add Event</span>
            </Button>
          )}
        </div>
        <div className="flex w-full flex-col gap-2">
          {selectedDateEvents.length === 0 ? (
            <div className="text-sm text-muted-foreground py-2 text-center">
              No appointments for this date
            </div>
          ) : (
            selectedDateEvents.map((event) => (
              <button
                key={event.id}
                onClick={() => onEventClick?.(event)}
                className="bg-muted after:bg-primary/70 relative rounded-md p-2 pl-6 text-sm after:absolute after:inset-y-2 after:left-2 after:w-1 after:rounded-full text-left hover:bg-muted/80 transition-colors w-full"
              >
                <div className="font-medium">{event.title}</div>
                <div className="text-muted-foreground text-xs">
                  {formatDateRange(event.from, event.to)}
                </div>
                {event.author && (
                  <div className="text-muted-foreground text-xs mt-0.5">
                    {event.author}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

CalendarWithEventSlots.displayName = "CalendarWithEventSlots";
