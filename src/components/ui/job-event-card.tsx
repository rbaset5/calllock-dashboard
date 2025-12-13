// components/ui/job-event-card.tsx

"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { MoreHorizontal, User, Phone, MessageSquare, MapPin, Eye, Calendar, X } from "lucide-react";
import {
  DropDrawer,
  DropDrawerTrigger,
  DropDrawerContent,
  DropDrawerItem,
  DropDrawerSeparator,
} from "@/components/ui/dropdrawer";

// Define the props for the JobEventCard component
export interface JobEventCardProps {
  title: string; // Main job type (e.g., "Plumbing Services")
  address: string; // Location address
  customerName: string;
  estimatedValue?: number;
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
  /** Customer phone number for call/SMS actions */
  phone?: string;
}

/**
 * A reusable job event card component with animations and theme support.
 * Based on the wireframe showing: Time | Title, Address, Customer Name, and Price.
 */
const JobEventCard = React.forwardRef<HTMLDivElement, JobEventCardProps>(
  (
    {
      title,
      address,
      customerName,
      estimatedValue,
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
      phone,
    },
    ref
  ) => {
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
          "w-full rounded-2xl p-4 text-card-foreground cursor-pointer",
          compact ? "bg-primary/5" : "bg-card border shadow-sm",
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
        aria-label={`${title} job details`}
      >
        <div className="flex gap-0">
          {/* Time Column - Left side with shaded background (hidden in compact mode) */}
          {!compact && (
            <div className="flex-shrink-0 w-16 -m-4 mr-4 rounded-l-2xl bg-primary/10 flex flex-col items-center justify-center">
              {scheduledTime ? (
                <>
                  <div className="text-lg font-semibold text-primary">
                    {scheduledTime}
                  </div>
                  <div className="text-xs text-primary/70 uppercase">
                    {scheduledPeriod}
                  </div>
                </>
              ) : (
                <div className="text-sm text-primary/70">TBD</div>
              )}
            </div>
          )}

          {/* Content Column - Right side */}
          <div className="flex-1 min-w-0 flex flex-col space-y-2">
            {/* Row 1: Title with menu icon */}
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <h3 className="text-base font-bold text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground">{address}</p>
              </div>
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

            {/* Row 2: Customer & Price */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">{customerName}</span>
              </div>
              {estimatedValue !== undefined && (
                <span className="text-base font-semibold text-foreground">
                  ${estimatedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }
);

JobEventCard.displayName = "JobEventCard";

export { JobEventCard };
