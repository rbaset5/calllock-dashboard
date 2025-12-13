"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type ScheduleCalendarProps = React.ComponentProps<typeof DayPicker> & {
  /** Map of date string (yyyy-MM-dd) to job count for showing booking dots */
  jobCounts?: Record<string, number>;
};

function ScheduleCalendar({
  className,
  classNames,
  showOutsideDays = true,
  components: userComponents,
  modifiers: userModifiers,
  modifiersClassNames: userModifiersClassNames,
  jobCounts = {},
  ...props
}: ScheduleCalendarProps) {
  // Create a list of dates that have bookings
  const datesWithBookings = React.useMemo(() => {
    return Object.entries(jobCounts)
      .filter(([, count]) => count > 0)
      .map(([dateStr]) => new Date(dateStr + "T00:00:00"));
  }, [jobCounts]);

  const defaultClassNames = {
    months: "relative flex flex-col sm:flex-row gap-4 w-full",
    month: "w-full",
    month_caption: "relative mx-10 mb-1 flex h-9 items-center justify-center z-20",
    caption_label: "text-sm font-medium",
    nav: "absolute top-0 flex w-full justify-between z-10",
    button_previous: cn(
      buttonVariants({ variant: "ghost" }),
      "size-9 text-muted-foreground/80 hover:text-foreground p-0",
    ),
    button_next: cn(
      buttonVariants({ variant: "ghost" }),
      "size-9 text-muted-foreground/80 hover:text-foreground p-0",
    ),
    month_grid: "w-full border-collapse",
    weekdays: "flex w-full",
    weekday: "flex-1 p-2 text-center text-xs font-medium text-muted-foreground/80",
    week: "flex w-full",
    day: "group flex-1 p-0 text-center text-sm relative",
    day_button:
      "relative flex w-full aspect-square items-center justify-center whitespace-nowrap rounded-lg p-0 text-foreground outline-offset-2 transition-colors focus:outline-none group-data-[disabled]:pointer-events-none focus-visible:z-10 hover:bg-accent group-data-[selected]:bg-primary hover:text-foreground group-data-[selected]:text-primary-foreground group-data-[disabled]:text-foreground/30 group-data-[disabled]:line-through group-data-[outside]:text-foreground/30 group-data-[outside]:group-data-[selected]:text-primary-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70",
    range_start: "range-start",
    range_end: "range-end",
    range_middle: "range-middle",
    today:
      "*:after:pointer-events-none *:after:absolute *:after:bottom-1 *:after:start-1/2 *:after:z-10 *:after:size-[3px] *:after:-translate-x-1/2 *:after:rounded-full *:after:bg-primary [&[data-selected]:not(.range-middle)>*]:after:bg-background [&[data-disabled]>*]:after:bg-foreground/30 *:after:transition-colors",
    outside: "text-muted-foreground data-selected:bg-accent/50 data-selected:text-muted-foreground",
    hidden: "invisible",
    week_number: "flex-1 p-2 text-center text-xs font-medium text-muted-foreground/80",
  };

  const mergedClassNames: typeof defaultClassNames = Object.keys(defaultClassNames).reduce(
    (acc, key) => ({
      ...acc,
      [key]: classNames?.[key as keyof typeof classNames]
        ? cn(
            defaultClassNames[key as keyof typeof defaultClassNames],
            classNames[key as keyof typeof classNames],
          )
        : defaultClassNames[key as keyof typeof defaultClassNames],
    }),
    {} as typeof defaultClassNames,
  );

  const defaultComponents = {
    Chevron: (chevronProps: { orientation?: "left" | "right" | "up" | "down"; className?: string; size?: number; disabled?: boolean }) => {
      if (chevronProps.orientation === "left") {
        return <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />;
      }
      return <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />;
    },
  };

  const mergedComponents = {
    ...defaultComponents,
    ...userComponents,
  };

  // Merge modifiers - add hasBooking modifier
  const mergedModifiers = {
    hasBooking: datesWithBookings,
    ...userModifiers,
  };

  // Add style for dates with bookings - show a dot indicator
  const mergedModifiersClassNames = {
    hasBooking: "*:before:pointer-events-none *:before:absolute *:before:bottom-1 *:before:start-1/2 *:before:z-10 *:before:size-1.5 *:before:-translate-x-1/2 *:before:rounded-full *:before:bg-blue-500 [&[data-selected]>*]:before:bg-white",
    ...userModifiersClassNames,
  };

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("w-full p-0", className)}
      classNames={mergedClassNames}
      components={mergedComponents}
      modifiers={mergedModifiers}
      modifiersClassNames={mergedModifiersClassNames}
      {...props}
    />
  );
}
ScheduleCalendar.displayName = "ScheduleCalendar";

export { ScheduleCalendar };
