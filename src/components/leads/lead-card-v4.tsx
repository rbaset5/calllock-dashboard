'use client';

import { useState } from 'react';
import { Lead, PriorityColor, OperatorNote } from '@/types/database';
import { LeadWithNotes } from '@/app/api/action/route';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RevenueTierBadge } from '@/components/ui/revenue-tier-badge';
import {
  Phone,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  AlertTriangle,
  Building2,
  User,
  Ban,
  Play,
  ExternalLink,
  Check,
  ArrowRight,
  StickyNote,
} from 'lucide-react';
import { MoreMenu } from './more-menu';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';

interface LeadCardV4Props {
  lead: LeadWithNotes;
  onCall?: (lead: Lead) => void;
  onBook?: (lead: Lead) => void;
  onArchive?: (lead: Lead) => void;
  onAddNote?: (lead: Lead) => void;
  onMarkSpam?: (lead: Lead) => void;
  onClick?: (lead: Lead) => void;
  showExpandedByDefault?: boolean;
  hidePriorityBadge?: boolean; // If true, the priority badge (e.g., COMMERCIAL $$$, NEW LEAD) will be hidden
  className?: string;
}

/** Priority color configuration */
const PRIORITY_CONFIG: Record<PriorityColor, {
  badge: string;
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  icon: typeof AlertTriangle;
}> = {
  red: {
    badge: 'CALLBACK RISK',
    label: 'Callback Risk',
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
    borderColor: 'border-l-red-500',
    icon: AlertTriangle,
  },
  green: {
    badge: 'COMMERCIAL',
    label: 'Commercial',
    bgColor: 'bg-emerald-100',
    textColor: 'text-emerald-700',
    borderColor: 'border-l-emerald-500',
    icon: Building2,
  },
  blue: {
    badge: 'NEW LEAD',
    label: 'New Lead',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
    borderColor: 'border-l-blue-500',
    icon: User,
  },
  gray: {
    badge: 'SPAM',
    label: 'Spam',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-500',
    borderColor: 'border-l-gray-300',
    icon: Ban,
  },
};

/** Format time ago - shows elapsed time for today, full datetime for past days */
function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const now = new Date();

    // Check if same day (today)
    const isToday =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();

    if (isToday) {
      // Calculate elapsed time in minutes
      const diffMs = Math.abs(now.getTime() - date.getTime());
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMinutes / 60);
      const remainingMinutes = diffMinutes % 60;

      if (diffHours === 0) {
        if (diffMinutes <= 1) return 'just now';
        return `${diffMinutes} minutes ago`;
      } else if (diffHours === 1) {
        return remainingMinutes > 0
          ? `about 1 hour ago`
          : '1 hour ago';
      } else {
        return `about ${diffHours} hours ago`;
      }
    } else {
      // Show full datetime for past days (e.g., "Dec 18, 2024 at 9:30 AM")
      return format(date, "MMM d, yyyy 'at' h:mm a");
    }
  } catch {
    return '';
  }
}

/** Get first sentence from AI summary */
function getFirstSentence(summary: string | null): string {
  if (!summary) return 'Service request';
  // Remove bracketed text like [RED - Callback Risk]
  const cleanSummary = summary.replace(/\[.*?\]/g, '').trim();
  const firstSentence = cleanSummary.split(/[.!?]/)[0].trim();
  return firstSentence.length > 80 ? firstSentence.slice(0, 80) + '...' : firstSentence;
}

/** Get street address (first part before comma) */
function getShortAddress(address: string | null): string {
  if (!address) return 'Address pending';
  const parts = address.split(',');
  return parts[0].trim();
}

export function LeadCardV4({
  lead,
  onCall,
  onBook,
  onArchive,
  onAddNote,
  onMarkSpam,
  onClick,
  showExpandedByDefault = false,
  hidePriorityBadge = false,
  className,
}: LeadCardV4Props) {
  const [expanded, setExpanded] = useState(showExpandedByDefault);

  const priorityConfig = PRIORITY_CONFIG[lead.priority_color] || PRIORITY_CONFIG.blue;

  const timeAgo = formatTimeAgo(lead.created_at);

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCall) {
      onCall(lead);
    } else {
      // Native phone dialer
      window.location.href = `tel:${lead.customer_phone}`;
    }
  };

  const handleBook = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onBook) {
      onBook(lead);
    }
  };

  const handleArchive = () => {
    if (onArchive) {
      onArchive(lead);
    }
  };

  const handleAddNote = () => {
    if (onAddNote) {
      onAddNote(lead);
    }
  };

  const handleMarkSpam = () => {
    if (onMarkSpam) {
      onMarkSpam(lead);
    }
  };

  // Card click always toggles expand (inline expansion per PRD)
  const handleCardClick = () => {
    if (onClick) {
      onClick(lead);
    }
    setExpanded(!expanded);
  };

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  // Open address in maps
  const openInMaps = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lead.customer_address) {
      const encoded = encodeURIComponent(lead.customer_address);
      window.open(`https://maps.google.com/maps?q=${encoded}`, '_blank');
    }
  };

  // Map priority color to variant for border-top styling
  const variantMap: Record<PriorityColor, "red" | "green" | "blue" | "gray"> = {
    red: "red",
    green: "green",
    blue: "blue",
    gray: "gray",
  };
  const borderVariant = variantMap[lead.priority_color] || "blue";

  // Border top color classes matching the animated card style
  const borderTopClasses: Record<PriorityColor, string> = {
    red: "border-t-[#C63F3E]",    // Red Passion
    green: "border-t-[#EAC119]",  // Mustard Yellow
    blue: "border-t-[#808BC5]",   // Lavender
    gray: "border-t-[#1D1D1B]",   // Muted Black
  };

  return (
    <Card
      className={cn(
        'relative w-full overflow-hidden rounded-xl bg-white shadow-md transition-shadow duration-300 hover:shadow-2xl border-x-0 border-b-0',
        'border-t-4',
        // Use distinctive priority colors for borders
        borderTopClasses[lead.priority_color] || "border-t-[#808BC5]",
        onClick && 'cursor-pointer',
        className
      )}
      onClick={handleCardClick}
    >
      <CardContent className="p-0 lg:p-0">
        {/* Main content area */}
        <div className="p-4 lg:p-5">
          {/* Header: Name + Priority Badge + Time */}
          {/* Header: Time + Name + Priority Badge */}
          <div className="mb-2">
            <div
              className={cn(
                "text-xs text-gray-400",
                (() => {
                  if (!lead.created_at) return false;
                  const date = new Date(lead.created_at);
                  const now = new Date();
                  return (
                    date.getFullYear() === now.getFullYear() &&
                    date.getMonth() === now.getMonth() &&
                    date.getDate() === now.getDate()
                  );
                })()
                  ? "mb-3 text-center"
                  : "mb-1"
              )}
            >
              {timeAgo}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900 text-lg leading-tight">
                {lead.customer_name}
              </h3>
              {!hidePriorityBadge && (
                <div
                  className={cn(
                    'inline-flex items-center shrink-0',
                    'bg-yellow-100/60 text-gray-800',
                    'transform font-sharpie tracking-wide',
                    // Uniform sizing (slightly smaller), different rotations
                    'px-3 py-1 text-[11px]',
                    lead.priority_color === 'red' && '-rotate-1',
                    lead.priority_color === 'green' && 'rotate-1',
                    lead.priority_color === 'blue' && '-rotate-1',
                    lead.priority_color === 'gray' && 'rotate-0.5'
                  )}
                  style={{
                    boxShadow: 'none',
                    filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.2))',
                    clipPath: 'polygon(0% 0%, 100% 0%, 96% 10%, 100% 20%, 96% 30%, 100% 40%, 96% 50%, 100% 60%, 96% 70%, 100% 80%, 96% 90%, 100% 100%, 0% 100%, 4% 90%, 0% 80%, 4% 70%, 0% 60%, 4% 50%, 0% 40%, 4% 30%, 0% 20%, 4% 10%)'
                  }}
                >
                  {priorityConfig.badge}
                </div>
              )}
            </div>
          </div>

          {/* Issue summary */}

          {/* Issue summary */}
          <p className="text-sm text-gray-600 mb-2">
            {getFirstSentence(lead.ai_summary || lead.issue_description)}
          </p>

          {/* Meta info row */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            {lead.customer_address && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span>{getShortAddress(lead.customer_address)}</span>
              </div>
            )}
            {lead.time_preference && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{lead.time_preference}</span>
              </div>
            )}
          </div>

          {/* Revenue tier */}
          {lead.revenue_tier_label && (
            <div className="mt-2">
              <RevenueTierBadge
                tier={lead.revenue_tier}
                label={lead.revenue_tier_label}
                signals={lead.revenue_tier_signals}
              />
            </div>
          )}
        </div>

        {/* Expandable details - Clean row-based layout with grey background */}
        {expanded && (
          <div className="bg-[#FDFDFC] border border-stone-200 rounded-3xl overflow-hidden">
            <div className="px-4 py-4 lg:px-5 lg:py-5 space-y-4">
              {/* Priority row */}
              {lead.priority_reason && (
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-500 text-sm w-32 flex-shrink-0">Priority</span>
                  <span className="text-gray-900 text-sm flex-1">{lead.priority_reason}</span>
                </div>
              )}

              {/* Address row */}
              {lead.customer_address && (
                <button
                  onClick={openInMaps}
                  className="flex items-start gap-3 w-full text-left group"
                >
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-500 text-sm w-32 flex-shrink-0">Address</span>
                  <span className="text-gray-900 text-sm flex-1 group-hover:text-blue-600">
                    {lead.customer_address}
                  </span>
                </button>
              )}

              {/* Tel row */}
              <button
                onClick={handleCall}
                className="flex items-start gap-3 w-full text-left group"
              >
                <Phone className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-500 text-sm w-32 flex-shrink-0">Tel</span>
                <span className="text-gray-900 text-sm flex-1 group-hover:text-blue-600">
                  {lead.customer_phone}
                </span>
              </button>

              {/* Customer Preference row */}
              {lead.time_preference && (
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-500 text-sm w-32 flex-shrink-0">Customer Preference</span>
                  <span className="text-gray-900 text-sm flex-1">{lead.time_preference}</span>
                </div>
              )}

              {/* Duration row */}
              {lead.problem_duration && (
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-500 text-sm w-32 flex-shrink-0">Duration</span>
                  <span className="text-gray-900 text-sm flex-1">{lead.problem_duration}</span>
                </div>
              )}

              {/* Notes row - combines why_not_booked and operator notes */}
              {(lead.why_not_booked || (lead.notes && lead.notes.length > 0)) && (
                <div className="flex items-start gap-3">
                  <StickyNote className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-500 text-sm w-32 flex-shrink-0">Notes</span>
                  <div className="text-gray-900 text-sm flex-1 space-y-2">
                    {lead.why_not_booked && (
                      <p>{lead.why_not_booked}</p>
                    )}
                    {lead.notes?.map((note) => (
                      <p key={note.id}>{note.note_text}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Summary - Description style at bottom */}
              {lead.ai_summary && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-gray-500 text-sm mb-1">AI Summary</p>
                  <p className="text-gray-700 text-sm leading-relaxed">{lead.ai_summary}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action buttons - PRD: [Call] [Book] [...] */}
        {/* Hide Call/Book for SPAM (gray) - they should only be convertible/archivable */}
        <div className={cn("flex items-center", !expanded && "border-t border-gray-200")}>
          {lead.priority_color !== 'gray' && (
            <>
              {/* Call button */}
              <Button
                variant="ghost"
                className="flex-1 h-12 rounded-none border-r border-gray-200 text-navy-600 hover:bg-navy-50"
                onClick={handleCall}
              >
                <Phone className="w-5 h-5 mr-2" />
                Call
              </Button>

              {/* Book button */}
              <Button
                variant="ghost"
                className="flex-1 h-12 rounded-none border-r border-gray-200 text-navy-600 hover:bg-navy-50"
                onClick={handleBook}
              >
                <Calendar className="w-5 h-5 mr-2" />
                Book
              </Button>
            </>
          )}

          {/* More menu (...) */}
          <MoreMenu
            onArchive={handleArchive}
            onAddNote={handleAddNote}
            onMarkSpam={handleMarkSpam}
            className={cn(lead.priority_color === 'gray' && "w-full hover:bg-gray-50")}
          />
        </div>
      </CardContent>
    </Card>
  );
}

interface ActionEmptyStateProps {
  totalCalls?: number;
  aiBooked?: number;
}

/** Empty state component for ACTION page - V4 PRD with AI stats */
export function ActionEmptyState({ totalCalls = 0, aiBooked = 0 }: ActionEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {/* Green checkmark icon */}
      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
        <Check className="w-8 h-8 text-emerald-600" />
      </div>

      {/* Main message */}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">All caught up!</h3>

      {/* AI stats - only show if there are any */}
      {(totalCalls > 0 || aiBooked > 0) && (
        <div className="text-sm text-gray-500 mb-4 space-y-1">
          {totalCalls > 0 && (
            <p>
              <span className="font-semibold text-navy-700">{totalCalls}</span>{' '}
              {totalCalls === 1 ? 'call' : 'calls'} handled by AI
            </p>
          )}
          {aiBooked > 0 && (
            <p>
              <span className="font-semibold text-gold-600">{aiBooked}</span>{' '}
              {aiBooked === 1 ? 'appointment' : 'appointments'} booked automatically
            </p>
          )}
        </div>
      )}

      {/* Link to history */}
      <a
        href="/history"
        className="text-sm text-navy-600 hover:text-navy-800 font-medium flex items-center gap-1"
      >
        View History
        <ArrowRight className="w-4 h-4" />
      </a>
    </div>
  );
}
