"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Phone } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { formatDistanceToNow, parseISO, differenceInMinutes } from "date-fns"

export interface JobSummaryCardProps {
  // Required
  requestType: string        // "Callback Request", "Missed Call", "Quote Follow-up"
  problem: string            // "AC Blowing Warm", "Unknown Issue"
  customerName: string
  customerPhone: string
  receivedAt: string         // ISO timestamp

  // Optional
  businessName?: string      // For commercial customers

  // Actions
  onCallNow?: () => void

  // Styling
  className?: string

  // Legacy props for backwards compatibility (deprecated)
  /** @deprecated Use requestType + problem instead */
  title?: string
  /** @deprecated Use customerName instead */
  address?: string
  /** @deprecated Use receivedAt instead */
  scheduledTime?: string
  /** @deprecated No longer displayed */
  estimatedValue?: number
  /** @deprecated Use requestType instead */
  serviceType?: string
  /** @deprecated No longer used */
  icon?: React.ReactNode
  /** @deprecated Use onCallNow instead */
  onViewDetails?: () => void
  /** @deprecated No longer displayed */
  onNavigate?: () => void
  /** @deprecated No longer used */
  tooltipText?: string
  /** @deprecated No longer used */
  gradientFrom?: string
  /** @deprecated No longer used */
  gradientTo?: string
}

// Get urgency color based on age
const getAgeColor = (receivedAt: string): string => {
  try {
    const minutesAgo = differenceInMinutes(new Date(), parseISO(receivedAt))
    if (minutesAgo > 120) return 'text-error-600'  // Red: > 2 hours
    if (minutesAgo > 60) return 'text-gold-600'    // Gold: > 1 hour
    return 'text-navy-400'                          // Normal: < 1 hour
  } catch {
    return 'text-navy-400'
  }
}

// Format relative time
const formatAge = (receivedAt: string): string => {
  try {
    return formatDistanceToNow(parseISO(receivedAt), { addSuffix: false }) + ' ago'
  } catch {
    return ''
  }
}

export const JobSummaryCard: React.FC<JobSummaryCardProps> = ({
  requestType,
  problem,
  customerName,
  customerPhone,
  receivedAt,
  businessName,
  onCallNow,
  className,
  // Legacy props - support backwards compatibility
  title,
  serviceType,
  onViewDetails,
}) => {
  // Backwards compatibility: construct display values from legacy props if new ones not provided
  const displayRequestType = requestType || serviceType || 'Action Needed'
  const displayProblem = problem || title || 'Unknown Issue'
  const displayAge = receivedAt ? formatAge(receivedAt) : ''
  const ageColor = receivedAt ? getAgeColor(receivedAt) : 'text-navy-400'

  // Use onCallNow or fall back to onViewDetails for backwards compat
  const handleCall = () => {
    if (onCallNow) {
      onCallNow()
    } else if (customerPhone) {
      window.location.href = `tel:${customerPhone}`
    } else if (onViewDetails) {
      onViewDetails()
    }
  }

  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: "0 8px 20px rgba(0,0,0,0.12)" }}
      transition={{ duration: 0.2 }}
      className={cn(
        "relative w-full max-w-sm overflow-hidden rounded-[28px]",
        "bg-white",
        "border border-black/10 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5",
        className
      )}
    >
      <div className="p-4 space-y-3">
        {/* Header: Request Type + Problem | Age */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-navy-800 line-clamp-2">
              {displayRequestType}: {displayProblem}
            </h3>
          </div>
          {displayAge && (
            <span className={cn("text-sm font-medium whitespace-nowrap", ageColor)}>
              {displayAge}
            </span>
          )}
        </div>

        {/* Customer Info */}
        <div>
          <p className="text-sm font-semibold text-navy-700">{customerName}</p>
          {businessName && (
            <p className="text-sm text-navy-500">({businessName})</p>
          )}
        </div>

        {/* Primary Action */}
        <Button
          onClick={handleCall}
          size="lg"
          className="w-full gap-2 bg-navy-700 hover:bg-navy-800 text-white font-semibold"
        >
          <Phone className="h-4 w-4" />
          CALL NOW
        </Button>
      </div>
    </motion.div>
  )
}
