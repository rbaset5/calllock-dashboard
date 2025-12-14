'use client';

import { ActionItem, ActionItemType } from '@/app/api/today/route';
import { Phone, MoreHorizontal, MessageSquare, Calendar, XCircle, Clock, Eye, History, CheckCircle, User } from 'lucide-react';
import { formatRelativeTime } from '@/lib/format';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  DropDrawer,
  DropDrawerTrigger,
  DropDrawerContent,
  DropDrawerItem,
  DropDrawerSeparator,
} from '@/components/ui/dropdrawer';

interface ActionItemCardProps {
  item: ActionItem;
  onCallBack?: (item: ActionItem) => void;
  onBookJob?: (item: ActionItem) => void;
  onFollowUp?: (item: ActionItem) => void;
  onViewQuote?: (item: ActionItem) => void;
  onViewHistory?: (item: ActionItem) => void;
  onMarkComplete?: (item: ActionItem) => void;
  onSnooze?: (item: ActionItem) => void;
  onSMS?: (item: ActionItem) => void;
  onMarkLost?: (item: ActionItem) => void;
  onViewDetails?: (item: ActionItem) => void;
}

function getStatusConfig(type: ActionItemType): { label: string; pillClass: string } {
  switch (type) {
    case 'missed_call':
      return { label: 'Missed Call', pillClass: 'bg-red-50 text-red-700 border-red-100' };
    case 'needs_callback':
      return { label: 'Needs Callback', pillClass: 'bg-orange-50 text-orange-700 border-orange-100' };
    case 'pending_quote':
      return { label: 'Quote Pending', pillClass: 'bg-yellow-50 text-yellow-700 border-yellow-100' };
    case 'callback_requested':
      return { label: 'Callback Requested', pillClass: 'bg-amber-50 text-amber-700 border-amber-100' };
    case 'follow_up_due':
      return { label: 'Follow-up Due', pillClass: 'bg-blue-50 text-blue-700 border-blue-100' };
    default:
      return { label: 'Action Needed', pillClass: 'bg-gray-50 text-gray-700 border-gray-100' };
  }
}

function getAvatarColor(name: string): { bg: string; text: string } {
  const colors = [
    { bg: 'bg-blue-100', text: 'text-blue-600' },
    { bg: 'bg-green-100', text: 'text-green-600' },
    { bg: 'bg-purple-100', text: 'text-purple-600' },
    { bg: 'bg-pink-100', text: 'text-pink-600' },
    { bg: 'bg-orange-100', text: 'text-orange-600' },
    { bg: 'bg-teal-100', text: 'text-teal-600' },
    { bg: 'bg-indigo-100', text: 'text-indigo-600' },
    { bg: 'bg-rose-100', text: 'text-rose-600' },
  ];

  // Simple hash based on name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

function getServiceTypeDisplay(item: ActionItem): string {
  // Use serviceType if available, otherwise fall back to lastServiceType for follow-ups
  const serviceType = item.serviceType || item.lastServiceType;

  if (!serviceType) {
    return 'Service Request';
  }

  // Format the service type nicely
  const formatMap: Record<string, string> = {
    'hvac': 'HVAC Service',
    'plumbing': 'Plumbing',
    'electrical': 'Electrical',
    'general': 'General Service',
  };

  return formatMap[serviceType.toLowerCase()] || serviceType;
}

function formatDueDate(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (dateOnly.getTime() === today.getTime()) {
      return 'Today';
    }
    return format(date, 'MMM d');
  } catch {
    return dateStr;
  }
}

export function ActionItemCard({
  item,
  onCallBack,
  onBookJob,
  onViewQuote,
  onViewHistory,
  onMarkComplete,
  onSnooze,
  onSMS,
  onMarkLost,
  onViewDetails,
}: ActionItemCardProps) {
  const statusConfig = getStatusConfig(item.type);

  const handleCall = () => {
    if (item.phone) {
      window.location.href = `tel:${item.phone}`;
    }
    onCallBack?.(item);
  };

  // Get the summary/note text
  const noteText = item.summary || '';

  // Get the time display
  const timeDisplay = item.type === 'follow_up_due' && item.dueDate
    ? formatDueDate(item.dueDate)
    : formatRelativeTime(item.createdAt);

  // Render type-specific menu items for the three-dot dropdown
  const renderMenuItems = () => {
    switch (item.type) {
      case 'missed_call':
      case 'needs_callback':
      case 'callback_requested':
        return (
          <>
            <DropDrawerItem onClick={handleCall}>
              <Phone className="w-4 h-4" />
              <span>Call Customer</span>
            </DropDrawerItem>
            {onSMS && (
              <DropDrawerItem onClick={() => onSMS(item)}>
                <MessageSquare className="w-4 h-4" />
                <span>Send Text</span>
              </DropDrawerItem>
            )}
            {onBookJob && (
              <DropDrawerItem onClick={() => onBookJob(item)}>
                <Calendar className="w-4 h-4" />
                <span>Book Job</span>
              </DropDrawerItem>
            )}
            {onSnooze && (
              <DropDrawerItem onClick={() => onSnooze(item)}>
                <Clock className="w-4 h-4" />
                <span>Snooze</span>
              </DropDrawerItem>
            )}
            {onMarkLost && (
              <>
                <DropDrawerSeparator />
                <DropDrawerItem onClick={() => onMarkLost(item)} destructive>
                  <XCircle className="w-4 h-4" />
                  <span>Mark as Lost</span>
                </DropDrawerItem>
              </>
            )}
          </>
        );
      case 'pending_quote':
        return (
          <>
            <DropDrawerItem onClick={handleCall}>
              <Phone className="w-4 h-4" />
              <span>Call Customer</span>
            </DropDrawerItem>
            {onSMS && (
              <DropDrawerItem onClick={() => onSMS(item)}>
                <MessageSquare className="w-4 h-4" />
                <span>Send Text</span>
              </DropDrawerItem>
            )}
            {onViewQuote && (
              <DropDrawerItem onClick={() => onViewQuote(item)}>
                <Eye className="w-4 h-4" />
                <span>View Quote</span>
              </DropDrawerItem>
            )}
            {onBookJob && (
              <DropDrawerItem onClick={() => onBookJob(item)}>
                <Calendar className="w-4 h-4" />
                <span>Book Job</span>
              </DropDrawerItem>
            )}
            {onMarkLost && (
              <>
                <DropDrawerSeparator />
                <DropDrawerItem onClick={() => onMarkLost(item)} destructive>
                  <XCircle className="w-4 h-4" />
                  <span>Mark as Lost</span>
                </DropDrawerItem>
              </>
            )}
          </>
        );
      case 'follow_up_due':
        return (
          <>
            <DropDrawerItem onClick={handleCall}>
              <Phone className="w-4 h-4" />
              <span>Call Customer</span>
            </DropDrawerItem>
            {onSMS && (
              <DropDrawerItem onClick={() => onSMS(item)}>
                <MessageSquare className="w-4 h-4" />
                <span>Send Text</span>
              </DropDrawerItem>
            )}
            {onViewHistory && (
              <DropDrawerItem onClick={() => onViewHistory(item)}>
                <History className="w-4 h-4" />
                <span>View History</span>
              </DropDrawerItem>
            )}
            {onMarkComplete && (
              <DropDrawerItem onClick={() => onMarkComplete(item)}>
                <CheckCircle className="w-4 h-4" />
                <span>Mark Complete</span>
              </DropDrawerItem>
            )}
            {onSnooze && (
              <DropDrawerItem onClick={() => onSnooze(item)}>
                <Clock className="w-4 h-4" />
                <span>Snooze</span>
              </DropDrawerItem>
            )}
          </>
        );
      default:
        return (
          <DropDrawerItem onClick={handleCall}>
            <Phone className="w-4 h-4" />
            <span>Call Customer</span>
          </DropDrawerItem>
        );
    }
  };

  const serviceTypeDisplay = getServiceTypeDisplay(item);

  const handleViewDetails = () => {
    // Prefer the explicit onViewDetails handler for navigation
    if (onViewDetails) {
      onViewDetails(item);
      return;
    }
    // Fallback to existing behavior
    if (item.type === 'pending_quote' && onViewQuote) {
      onViewQuote(item);
    } else if (item.type === 'follow_up_due' && onViewHistory) {
      onViewHistory(item);
    } else if (onBookJob) {
      onBookJob(item);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Card Content */}
      <div className="p-5 flex-1">
        {/* Title Row: Service Type + Badge + Menu */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <h3 className="text-xl font-semibold text-gray-900 truncate">{serviceTypeDisplay}</h3>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={cn(
              'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border whitespace-nowrap',
              statusConfig.pillClass
            )}>
              {statusConfig.label}
            </span>
            <DropDrawer>
              <DropDrawerTrigger asChild>
                <button className="p-1 text-gray-400 hover:text-gray-600 rounded">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </DropDrawerTrigger>
              <DropDrawerContent title={item.title}>
                {renderMenuItems()}
              </DropDrawerContent>
            </DropDrawer>
          </div>
        </div>

        {/* Customer Name with Avatar */}
        <div className="flex items-center gap-3 mt-2">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500">{item.title}</p>
        </div>

        {/* Note / Context */}
        {noteText && (
          <div className="bg-gray-50 rounded-lg p-3 mt-3">
            <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
              &ldquo;{noteText}&rdquo;
            </p>
          </div>
        )}

        {/* Quote Amount (for pending_quote type) */}
        {item.type === 'pending_quote' && item.quoteAmount && (
          <p className="text-sm font-medium text-gray-900 mt-3">
            ${item.quoteAmount.toLocaleString()} estimate
          </p>
        )}
      </div>

      {/* Action Footer - Two buttons */}
      <div className="flex border-t border-gray-200 divide-x divide-gray-200">
        <button
          onClick={handleViewDetails}
          className="flex-1 py-3.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors flex items-center justify-center gap-2"
        >
          <Eye className="w-4 h-4" />
          View Details
        </button>
        <button
          onClick={handleCall}
          className="flex-1 py-3.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors flex items-center justify-center gap-2"
        >
          <Phone className="w-4 h-4" />
          Call Now
        </button>
      </div>
    </div>
  );
}
