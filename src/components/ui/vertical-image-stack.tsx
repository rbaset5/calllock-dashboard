"use client"

import { useState, useCallback, useRef } from "react"
import { motion, type PanInfo } from "framer-motion"
import { JobSummaryCard } from "./job-summary-card"

export interface StackJob {
  id: string
  // New triage card fields
  requestType: string        // "Callback Request", "Missed Call", etc.
  problem: string            // "AC Blowing Warm", "Unknown Issue"
  customerName: string
  customerPhone: string
  receivedAt: string         // ISO timestamp for age calculation
  businessName?: string      // For commercial customers

  // Legacy fields for backwards compat (deprecated)
  /** @deprecated Use requestType instead */
  title?: string
  /** @deprecated No longer displayed */
  address?: string
  /** @deprecated Use receivedAt instead */
  scheduledTime?: string
  /** @deprecated No longer displayed */
  estimatedValue?: number
  /** @deprecated Use requestType instead */
  serviceType?: string
}

interface VerticalImageStackProps {
  jobs?: StackJob[]
  onJobClick?: (job: StackJob) => void
  onNavigate?: (job: StackJob) => void
}

// Demo jobs for preview
const demoJobs: StackJob[] = [
  {
    id: "1",
    requestType: "Callback Request",
    problem: "AC Blowing Warm Air",
    customerName: "John Smith",
    customerPhone: "+15125551234",
    receivedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min ago
  },
  {
    id: "2",
    requestType: "Missed Call",
    problem: "No Heat - Emergency",
    customerName: "Sarah Johnson",
    customerPhone: "+15125555678",
    receivedAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(), // 90 min ago
    businessName: "Johnson Bakery",
  },
  {
    id: "3",
    requestType: "Quote Follow-up",
    problem: "New Unit Estimate",
    customerName: "Mike Davis",
    customerPhone: "+15125559012",
    receivedAt: new Date(Date.now() - 150 * 60 * 1000).toISOString(), // 2.5 hrs ago
  },
  {
    id: "4",
    requestType: "Voicemail",
    problem: "Thermostat Not Working",
    customerName: "Emily Chen",
    customerPhone: "+15125553456",
    receivedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 min ago
  },
  {
    id: "5",
    requestType: "New Lead",
    problem: "Water Heater Leaking",
    customerName: "David Wilson",
    customerPhone: "+15125557890",
    receivedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 min ago
  },
]

// No longer needed - removed gradient header icons

export function VerticalImageStack({
  jobs = demoJobs,
  onJobClick,
  onNavigate
}: VerticalImageStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const lastNavigationTime = useRef(0)
  const navigationCooldown = 400 // ms between navigations

  const navigate = useCallback((newDirection: number) => {
    const now = Date.now()
    if (now - lastNavigationTime.current < navigationCooldown) return
    lastNavigationTime.current = now

    setCurrentIndex((prev) => {
      if (newDirection > 0) {
        return prev === jobs.length - 1 ? 0 : prev + 1
      }
      return prev === 0 ? jobs.length - 1 : prev - 1
    })
  }, [jobs.length])

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50
    if (info.offset.y < -threshold) {
      navigate(1)
    } else if (info.offset.y > threshold) {
      navigate(-1)
    }
  }

  const getCardStyle = (index: number) => {
    const total = jobs.length
    let diff = index - currentIndex
    if (diff > total / 2) diff -= total
    if (diff < -total / 2) diff += total

    if (diff === 0) {
      return { y: 0, scale: 1, opacity: 1, zIndex: 5, rotateX: 0 }
    } else if (diff === -1) {
      return { y: -100, scale: 0.9, opacity: 0.6, zIndex: 4, rotateX: 6 }
    } else if (diff === -2) {
      return { y: -170, scale: 0.8, opacity: 0.3, zIndex: 3, rotateX: 12 }
    } else if (diff === 1) {
      return { y: 100, scale: 0.9, opacity: 0.6, zIndex: 4, rotateX: -6 }
    } else if (diff === 2) {
      return { y: 170, scale: 0.8, opacity: 0.3, zIndex: 3, rotateX: -12 }
    } else {
      return { y: diff > 0 ? 250 : -250, scale: 0.7, opacity: 0, zIndex: 0, rotateX: diff > 0 ? -15 : 15 }
    }
  }

  const isVisible = (index: number) => {
    const total = jobs.length
    let diff = index - currentIndex
    if (diff > total / 2) diff -= total
    if (diff < -total / 2) diff += total
    return Math.abs(diff) <= 2
  }

  if (jobs.length === 0) {
    return null
  }

  return (
    <div className="relative flex h-[480px] w-full items-center justify-center overflow-hidden bg-transparent rounded-xl">
      {/* Card Stack */}
      <div className="relative flex h-[400px] w-full max-w-[340px] items-center justify-center" style={{ perspective: "1200px" }}>
        {jobs.map((job, index) => {
          if (!isVisible(index)) return null
          const style = getCardStyle(index)
          const isCurrent = index === currentIndex

          return (
            <motion.div
              key={job.id}
              className="absolute cursor-grab active:cursor-grabbing touch-none w-full px-4"
              animate={{
                y: style.y,
                scale: style.scale,
                opacity: style.opacity,
                rotateX: style.rotateX,
                zIndex: style.zIndex,
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
                mass: 1,
              }}
              drag={isCurrent ? "y" : false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              style={{
                transformStyle: "preserve-3d",
                zIndex: style.zIndex,
              }}
            >
              <JobSummaryCard
                requestType={job.requestType}
                problem={job.problem}
                customerName={job.customerName}
                customerPhone={job.customerPhone}
                receivedAt={job.receivedAt}
                businessName={job.businessName}
                onCallNow={() => {
                  if (job.customerPhone) {
                    window.location.href = `tel:${job.customerPhone}`
                  }
                }}
              />
            </motion.div>
          )
        })}
      </div>

      {/* Navigation dots */}
      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 flex-col gap-2">
        {jobs.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              if (index !== currentIndex) {
                setCurrentIndex(index)
              }
            }}
            className={`h-2 w-2 rounded-full transition-all duration-300 ${
              index === currentIndex ? "h-5 bg-navy-700" : "bg-navy-300 hover:bg-navy-400"
            }`}
            aria-label={`Go to job ${index + 1}`}
          />
        ))}
      </div>

      {/* Counter */}
      <div className="absolute left-2 top-1/2 -translate-y-1/2">
        <div className="flex flex-col items-center">
          <span className="text-2xl font-light text-navy-700 tabular-nums">
            {String(currentIndex + 1).padStart(2, "0")}
          </span>
          <div className="my-1.5 h-px w-6 bg-navy-200" />
          <span className="text-xs text-navy-400 tabular-nums">{String(jobs.length).padStart(2, "0")}</span>
        </div>
      </div>
    </div>
  )
}
