'use client';

import { useState } from 'react';
import { Phone, Calendar, MoreHorizontal, Clock, XCircle, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { phoneHref } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface StickyActionFooterProps {
  phone: string;
  onCall?: () => void;
  onBook?: () => void;
  onSnooze?: () => void;
  onMarkLost?: () => void;
  onAddNote?: () => void;
  isBooked?: boolean;
  showSnooze?: boolean;
  showMarkLost?: boolean;
  showAddNote?: boolean;
  className?: string;
}

/**
 * Sticky action footer for lead/job detail views
 * Fixed at bottom on mobile, relative on desktop
 * Large touch targets (48px+) for HVAC operators
 */
export function StickyActionFooter({
  phone,
  onCall,
  onBook,
  onSnooze,
  onMarkLost,
  onAddNote,
  isBooked = false,
  showSnooze = true,
  showMarkLost = true,
  showAddNote = true,
  className,
}: StickyActionFooterProps) {
  const handleCallClick = () => {
    onCall?.();
    // href will handle actual dialing
  };

  const hasMoreActions = showSnooze || showMarkLost || showAddNote;

  return (
    <div
      className={cn(
        // Mobile: Fixed at bottom with safe area
        'fixed bottom-0 left-0 right-0 z-40',
        'bg-white border-t border-gray-200',
        'px-4 py-3',
        // iOS safe area padding
        'pb-[max(12px,env(safe-area-inset-bottom))]',
        // Desktop: Relative positioning
        'lg:relative lg:border-0 lg:mt-4 lg:px-0 lg:py-0 lg:pb-0',
        className
      )}
    >
      <div className="flex items-center gap-3 max-w-lg mx-auto lg:max-w-none">
        {/* Call Button - Primary */}
        <a
          href={phoneHref(phone)}
          onClick={handleCallClick}
          className={cn(
            'flex-1 flex items-center justify-center gap-2',
            'h-12 rounded-lg font-medium',
            'bg-navy-600 text-white',
            'hover:bg-navy-700 active:bg-navy-800 transition-colors'
          )}
        >
          <Phone className="w-5 h-5" />
          <span>Call</span>
        </a>

        {/* Book Button - Secondary (if not already booked) */}
        {!isBooked && onBook && (
          <Button
            variant="outline"
            size="lg"
            onClick={onBook}
            className="flex-1 h-12 gap-2"
          >
            <Calendar className="w-5 h-5" />
            <span>Book Job</span>
          </Button>
        )}

        {/* More Actions Menu */}
        {hasMoreActions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 shrink-0"
              >
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {showSnooze && onSnooze && (
                <DropdownMenuItem onClick={onSnooze}>
                  <Clock className="w-4 h-4 mr-2" />
                  Snooze
                </DropdownMenuItem>
              )}
              {showAddNote && onAddNote && (
                <DropdownMenuItem onClick={onAddNote}>
                  <StickyNote className="w-4 h-4 mr-2" />
                  Add Note
                </DropdownMenuItem>
              )}
              {(showSnooze || showAddNote) && showMarkLost && (
                <DropdownMenuSeparator />
              )}
              {showMarkLost && onMarkLost && (
                <DropdownMenuItem
                  onClick={onMarkLost}
                  className="text-red-600 focus:text-red-600"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Mark as Lost
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

/**
 * Job-specific footer with status actions
 */
interface JobActionFooterProps {
  phone: string;
  jobId: string;
  currentStatus: string;
  onCall?: () => void;
  onReschedule?: () => void;
  onCancel?: () => void;
  onStatusChange?: (status: string) => void;
  canReschedule?: boolean;
  canCancel?: boolean;
  className?: string;
}

export function JobActionFooter({
  phone,
  jobId,
  currentStatus,
  onCall,
  onReschedule,
  onCancel,
  onStatusChange,
  canReschedule = true,
  canCancel = true,
  className,
}: JobActionFooterProps) {
  const handleCallClick = () => {
    onCall?.();
  };

  const showStatusActions = !['complete', 'cancelled'].includes(currentStatus);

  return (
    <div
      className={cn(
        // Mobile: Fixed at bottom with safe area
        'fixed bottom-0 left-0 right-0 z-40',
        'bg-white border-t border-gray-200',
        'px-4 py-3',
        'pb-[max(12px,env(safe-area-inset-bottom))]',
        // Desktop: Relative positioning
        'lg:relative lg:border-0 lg:mt-4 lg:px-0 lg:py-0 lg:pb-0',
        className
      )}
    >
      <div className="flex items-center gap-3 max-w-lg mx-auto lg:max-w-none">
        {/* Call Button - Primary */}
        <a
          href={phoneHref(phone)}
          onClick={handleCallClick}
          className={cn(
            'flex-1 flex items-center justify-center gap-2',
            'h-12 rounded-lg font-medium',
            'bg-navy-600 text-white',
            'hover:bg-navy-700 active:bg-navy-800 transition-colors'
          )}
        >
          <Phone className="w-5 h-5" />
          <span>Call</span>
        </a>

        {/* Reschedule Button */}
        {canReschedule && showStatusActions && onReschedule && (
          <Button
            variant="outline"
            size="lg"
            onClick={onReschedule}
            className="flex-1 h-12 gap-2"
          >
            <Calendar className="w-5 h-5" />
            <span>Reschedule</span>
          </Button>
        )}

        {/* More Actions */}
        {showStatusActions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 shrink-0"
              >
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {onStatusChange && currentStatus === 'new' && (
                <DropdownMenuItem onClick={() => onStatusChange('confirmed')}>
                  Confirm Job
                </DropdownMenuItem>
              )}
              {onStatusChange && currentStatus === 'confirmed' && (
                <DropdownMenuItem onClick={() => onStatusChange('en_route')}>
                  Mark En Route
                </DropdownMenuItem>
              )}
              {onStatusChange && currentStatus === 'en_route' && (
                <DropdownMenuItem onClick={() => onStatusChange('on_site')}>
                  Mark On Site
                </DropdownMenuItem>
              )}
              {onStatusChange && currentStatus === 'on_site' && (
                <DropdownMenuItem onClick={() => onStatusChange('complete')}>
                  Mark Complete
                </DropdownMenuItem>
              )}
              {canCancel && onCancel && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onCancel}
                    className="text-red-600 focus:text-red-600"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancel Job
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

/**
 * Spacer to prevent content from being hidden behind fixed footer
 * Add this at the bottom of scrollable content on mobile
 */
export function StickyFooterSpacer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        // Space for footer height + safe area on mobile
        'h-24 lg:h-0',
        className
      )}
      aria-hidden="true"
    />
  );
}

export default StickyActionFooter;
