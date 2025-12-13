"use client"

import * as React from "react"
import { format, isToday, getHours } from "date-fns"
import { cn } from "@/lib/utils"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"
import { JobEventCard } from "@/components/ui/job-event-card"

export type TimelineJob = {
  id: string
  title: string
  address: string
  customerName: string
  estimatedValue?: number
  scheduledTime: Date
}

type DailyTimelineProps = {
  startHour?: number // e.g. 6 for 6AM
  endHour?: number // e.g. 20 for 8PM
  jobs?: TimelineJob[]
  selectedDate?: Date
  onJobClick?: (job: TimelineJob) => void
}

export default function DailyTimelineScheduler({
  startHour = 8,
  endHour = 18,
  jobs = [],
  selectedDate = new Date(),
  onJobClick,
}: DailyTimelineProps) {
  // Calculate dynamic time range based on jobs
  const { dynamicStart, dynamicEnd } = React.useMemo(() => {
    if (jobs.length === 0) {
      // No jobs - show default range
      return { dynamicStart: startHour, dynamicEnd: endHour }
    }

    // Find earliest and latest job times
    let earliest = 23
    let latest = 0

    jobs.forEach((job) => {
      const jobHour = getHours(job.scheduledTime)
      if (jobHour < earliest) earliest = jobHour
      if (jobHour > latest) latest = jobHour
    })

    // Add 1 hour for service time to the end
    const endWithService = Math.min(latest + 1, 23)

    return { dynamicStart: earliest, dynamicEnd: endWithService }
  }, [jobs, startHour, endHour])

  // Generate time slots based on dynamic range
  const timeSlots: number[] = []
  for (let h = dynamicStart; h <= dynamicEnd; h++) {
    timeSlots.push(h)
  }

  const formatHour = (hour: number) => {
    const ampm = hour >= 12 ? "PM" : "AM"
    const displayHour = hour % 12 || 12
    return { time: `${displayHour}:00`, period: ampm }
  }

  // Get jobs at a specific hour
  const getJobsAtHour = (hour: number) => {
    return jobs.filter((job) => {
      const jobHour = getHours(job.scheduledTime)
      return jobHour === hour
    })
  }

  // Title: "Today" or formatted date
  const dateTitle = isToday(selectedDate) ? "Today" : format(selectedDate, "EEEE, MMMM d")

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-center text-lg">{dateTitle}</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <div className="flex flex-col max-h-[400px] overflow-y-auto">
          {timeSlots.map((hour, index) => {
            const { time, period } = formatHour(hour)
            const jobsAtHour = getJobsAtHour(hour)
            const hasJobs = jobsAtHour.length > 0

            return (
              <div
                key={hour}
                className={cn(
                  "flex",
                  index > 0 && "border-t border-border/50"
                )}
              >
                {/* Time Column - Left side */}
                <div className={cn(
                  "flex-shrink-0 w-16 bg-muted/30 border-r border-border/50 flex flex-col items-center justify-center py-3",
                  hasJobs ? "min-h-[5.5rem]" : "min-h-[3rem]"
                )}>
                  <div className="text-sm font-semibold text-primary">{time}</div>
                  <div className="text-xs text-muted-foreground uppercase">{period}</div>
                </div>

                {/* Job Content - Right side */}
                <div className={cn(
                  "flex-1 px-2 flex items-center",
                  hasJobs ? "py-2" : "py-3"
                )}>
                  {hasJobs ? (
                    <div className="w-full space-y-2">
                      {jobsAtHour.map((job) => (
                        <JobEventCard
                          key={job.id}
                          title={job.title}
                          address={job.address}
                          customerName={job.customerName}
                          estimatedValue={job.estimatedValue}
                          compact
                          onClick={() => onJobClick?.(job)}
                        />
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground/50">—</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
