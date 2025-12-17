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
import { formatDistanceToNow } from 'date-fns';

interface LeadCardV4Props {
  lead: LeadWithNotes;
  onCall?: (lead: Lead) => void;
  onBook?: (lead: Lead) => void;
  onArchive?: (lead: Lead) => void;
  onAddNote?: (lead: Lead) => void;
  onMarkSpam?: (lead: Lead) => void;
  onClick?: (lead: Lead) => void;
  showExpandedByDefault?: boolean;
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
    badge: 'COMMERCIAL $$$',
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
    badge: 'SPAM/VENDOR',
    label: 'Spam',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-500',
    borderColor: 'border-l-gray-300',
    icon: Ban,
  },
};

/** Format time ago */
function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
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
  className,
}: LeadCardV4Props) {
  const [expanded, setExpanded] = useState(showExpandedByDefault);

  const priorityConfig = PRIORITY_CONFIG[lead.priority_color] || PRIORITY_CONFIG.blue;
  const PriorityIcon = priorityConfig.icon;
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
    red: "border-t-red-500",
    green: "border-t-emerald-500",
    blue: "border-t-blue-500",
    gray: "border-t-gray-300",
  };

  return (
    <Card
      className={cn(
        'relative w-full overflow-hidden rounded-xl bg-card shadow-md transition-shadow duration-300 hover:shadow-2xl',
        'border-t-4',
        borderTopClasses[lead.priority_color] || "border-t-blue-500",
        onClick && 'cursor-pointer',
        className
      )}
      onClick={handleCardClick}
    >
      <CardContent className="p-0">
        {/* Main content area */}
        <div className="p-4">
          {/* Header: Name + Priority Badge + Time */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2 flex-wrap pr-2">
              <h3 className="font-semibold text-gray-900 text-lg leading-tight">
                {lead.customer_name}
              </h3>
              <div
                className={cn(
                  'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold shrink-0',
                  priorityConfig.bgColor,
                  priorityConfig.textColor
                )}
              >
                <PriorityIcon className="w-3 h-3" />
                {priorityConfig.badge}
              </div>
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap pt-1">{timeAgo}</span>
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

        {/* Expandable details - PRD layout */}
        {expanded && (
          <div className="px-4 pb-3 pt-0 border-t border-gray-100">
            <div className="pt-3 space-y-3 text-sm">
              {/* Priority reason */}
              {lead.priority_reason && (
                <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg">
                  <span className="text-amber-800 font-medium">Priority: </span>
                  <span className="text-amber-700">{lead.priority_reason}</span>
                </div>
              )}

              {/* Full AI summary */}
              {lead.ai_summary && (
                <div>
                  <p className="text-xs font-medium text-gray-400 mb-1">AI Summary</p>
                  <p className="text-gray-700 text-sm leading-relaxed">{lead.ai_summary}</p>
                </div>
              )}

              {/* Full address with maps link */}
              {lead.customer_address && (
                <button
                  onClick={openInMaps}
                  className="flex items-start gap-2 w-full text-left p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="text-gray-700">{lead.customer_address}</span>
                    <span className="text-blue-600 text-xs ml-2 inline-flex items-center gap-1">
                      Open in Maps <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                </button>
              )}

              {/* Phone with call link */}
              <button
                onClick={handleCall}
                className="flex items-center gap-2 w-full text-left p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-700">{lead.customer_phone}</span>
                <span className="text-blue-600 text-xs ml-2">Call Customer</span>
              </button>

              {/* Time preference (highlighted if present) */}
              {lead.time_preference && (
                <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="text-blue-800 font-medium">Customer preference: </span>
                  <span className="text-blue-700">{lead.time_preference}</span>
                </div>
              )}

              {/* Problem details */}
              {(lead.problem_duration || lead.problem_pattern) && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {lead.problem_duration && (
                    <div>
                      <span className="text-gray-400 font-medium">Duration: </span>
                      <span className="text-gray-600">{lead.problem_duration}</span>
                    </div>
                  )}
                  {lead.problem_pattern && (
                    <div>
                      <span className="text-gray-400 font-medium">Pattern: </span>
                      <span className="text-gray-600">{lead.problem_pattern}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Why not booked */}
              {lead.why_not_booked && (
                <div className="p-2 bg-gray-50 rounded-lg text-xs">
                  <span className="text-gray-400 font-medium">Note: </span>
                  <span className="text-gray-600 italic">{lead.why_not_booked}</span>
                </div>
              )}

              {/* Operator Notes */}
              {lead.notes && lead.notes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-400 flex items-center gap-1">
                    <StickyNote className="w-3 h-3" />
                    Notes ({lead.notes.length})
                  </p>
                  {lead.notes.map((note) => (
                    <div key={note.id} className="p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-xs">
                      <p className="text-gray-700">{note.note_text}</p>
                      <p className="text-gray-400 text-xs mt-1">
                        {note.created_by} · {formatTimeAgo(note.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action buttons - PRD: [Call] [Book] [...] */}
        {/* Action buttons - PRD: [Call] [Book] [...] */}
        {/* Hide Call/Book for SPAM (gray) - they should only be convertible/archivable */}
        <div className="flex items-center border-t border-gray-200">
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
