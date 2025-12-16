// components/ui/job-event-card.tsx

"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { MoreHorizontal, Phone, MessageSquare, MapPin, Eye, Calendar, X } from "lucide-react";
import {
  DropDrawer,
  DropDrawerTrigger,
  DropDrawerContent,
  DropDrawerItem,
  DropDrawerSeparator,
} from "@/components/ui/dropdrawer";

// Define the props for the JobEventCard component
export interface JobEventCardProps {
  /** Problem type / issue description (e.g., "AC Not Cooling") */
  problemType: string;
  customerName: string;
  /** Customer phone number - displayed on card and used for call/SMS actions */
  phone?: string;
  /** Neighborhood or area (e.g., "East Austin") */
  neighborhood?: string;
  scheduledTime?: string; // e.g., "8:00"
  scheduledPeriod?: string; // e.g., "AM" or "PM"
  className?: string;
  onClick?: () => void;
  /** When true, hides the time column (for use in timeline views) */
  compact?: boolean;
  // Menu action callbacks
  onCall?: () => void;
  onSMS?: () => void;
  onNavigate?: () => void;
  onViewDetails?: () => void;
  onReschedule?: () => void;
  onCancel?: () => void;
  /** Full address - kept for navigation but not displayed */
  address?: string;
  // Deprecated props kept for backwards compatibility
  /** @deprecated Use problemType instead */
  title?: string;
  /** @deprecated No longer displayed on card */
  estimatedValue?: number;
}

/**
 * A reusable job event card component with animations and theme support.
 * Based on the wireframe showing: Time | Title, Address, Customer Name, and Price.
 */
const JobEventCard = React.forwardRef<HTMLDivElement, JobEventCardProps>(
  (
    {
      problemType,
      customerName,
      phone,
      neighborhood,
      scheduledTime,
      scheduledPeriod,
      className,
      onClick,
      compact = false,
      onCall,
      onSMS,
      onNavigate,
      onViewDetails,
      onReschedule,
      onCancel,
      address,
      // Deprecated props - kept for backwards compat
      title,
      estimatedValue,
    },
    ref
  ) => {
    // Support backwards compatibility: use problemType or fall back to title
    const displayProblem = problemType || title || "HVAC Service";
    // Animation variants for the card
    const cardVariants = {
      hidden: { opacity: 0, y: 20 },
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          duration: 0.4,
          ease: "easeOut" as const,
        },
      },
    };

    return (
      <motion.div
        ref={ref}
        className={cn(
          "w-full rounded-r-2xl rounded-l-sm p-4 text-card-foreground cursor-pointer",
          "border-l-4 border-l-navy-600",
          compact
            ? "bg-gradient-to-r from-navy-50/40 to-transparent"
            : "bg-gradient-to-r from-navy-50/60 to-white border-y border-r shadow-sm",
          className
        )}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        whileHover={{
          scale: 1.02,
          boxShadow: "0px 10px 20px -5px hsl(var(--primary) / 0.1)",
        }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        onClick={onClick}
        aria-label={`${displayProblem} job details`}
      >
        <div className="flex gap-0">
          {/* Time Column - Left side with shaded background (hidden in compact mode) */}
          {!compact && (
            <div className="flex-shrink-0 w-16 -m-4 mr-4 rounded-l-sm bg-navy-100 flex flex-col items-center justify-center">
              {scheduledTime ? (
                <>
                  <div className="text-lg font-semibold text-navy-700">
                    {scheduledTime}
                  </div>
                  <div className="text-xs text-navy-500 uppercase">
                    {scheduledPeriod}
                  </div>
                </>
              ) : (
                <div className="text-sm text-navy-400">TBD</div>
              )}
            </div>
          )}

          {/* Content Column - Right side */}
          <div className="flex-1 min-w-0 flex flex-col space-y-1">
            {/* Row 1: Problem Type with menu icon */}
            <div className="flex items-start justify-between">
              <h3 className="text-base font-bold text-navy-800 line-clamp-1">
                {displayProblem}
              </h3>
              <DropDrawer>
                <DropDrawerTrigger asChild>
                  <button
                    className="text-muted-foreground hover:text-foreground p-1 -mr-1 -mt-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </button>
                </DropDrawerTrigger>
                <DropDrawerContent title={customerName}>
                  {onCall && (
                    <DropDrawerItem onClick={onCall}>
                      <Phone className="w-4 h-4" />
                      <span>Call Customer</span>
                    </DropDrawerItem>
                  )}
                  {onSMS && (
                    <DropDrawerItem onClick={onSMS}>
                      <MessageSquare className="w-4 h-4" />
                      <span>Send Text</span>
                    </DropDrawerItem>
                  )}
                  {onNavigate && (
                    <DropDrawerItem onClick={onNavigate}>
                      <MapPin className="w-4 h-4" />
                      <span>Navigate</span>
                    </DropDrawerItem>
                  )}
                  {onViewDetails && (
                    <DropDrawerItem onClick={onViewDetails}>
                      <Eye className="w-4 h-4" />
                      <span>View Details</span>
                    </DropDrawerItem>
                  )}
                  {(onReschedule || onCancel) && (
                    <DropDrawerSeparator />
                  )}
                  {onReschedule && (
                    <DropDrawerItem onClick={onReschedule}>
                      <Calendar className="w-4 h-4" />
                      <span>Reschedule</span>
                    </DropDrawerItem>
                  )}
                  {onCancel && (
                    <DropDrawerItem onClick={onCancel} destructive>
                      <X className="w-4 h-4" />
                      <span>Cancel Job</span>
                    </DropDrawerItem>
                  )}
                </DropDrawerContent>
              </DropDrawer>
            </div>

            {/* Row 2: Customer Name */}
            <p className="text-sm font-semibold text-navy-700">{customerName}</p>

            {/* Row 3: Phone Number */}
            {phone && (
              <div className="flex items-center gap-1.5 text-sm text-navy-500">
                <Phone className="h-3.5 w-3.5 text-navy-400" />
                <span>{phone}</span>
              </div>
            )}

            {/* Row 4: Full Address */}
            {address && (
              <div className="flex items-center gap-1.5 text-sm text-navy-500">
                <MapPin className="h-3.5 w-3.5 text-navy-400 flex-shrink-0" />
                <span className="line-clamp-1">{address}</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }
);

JobEventCard.displayName = "JobEventCard";

export { JobEventCard };
