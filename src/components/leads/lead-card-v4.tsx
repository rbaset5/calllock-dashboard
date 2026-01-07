'use client';

import React, { useState } from 'react';
import {
  Phone,
  Calendar,
  ChevronDown,
  ChevronUp,
  MapPin,
  Bot,
  CheckCircle2,
  AlertCircle,
  Volume2,
  RotateCcw,
  Archive,
  MoreVertical
} from 'lucide-react';
import { Lead, LeadStatus, PriorityColor } from '@/types/database';
import { LeadWithNotes } from '@/app/api/action/route';
import { format, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { MoreMenu } from './more-menu';
import { QuickScanBar } from '@/components/ui/quick-scan-bar';

// ============================================================
// DESIGN TOKENS
// ============================================================

const tokens = {
  colors: {
    yourMove: {
      bg: '#FEF2F2',
      border: '#FCA5A5',
      accent: '#DC2626',
      badge: '#7F1D1D',
    },
    aiHandling: {
      bg: '#FFFBEB',
      border: '#FCD34D',
      accent: '#D97706',
      badge: '#78350F',
    },
    handled: {
      bg: '#F0FDF4',
      border: '#86EFAC',
      accent: '#16A34A',
      badge: '#14532D',
    },
    spam: {
      bg: '#F9FAFB',
      border: '#D1D5DB',
      accent: '#6B7280',
      badge: '#374151',
    },
    surface: '#FFFFFF',
    text: {
      primary: '#111827',
      secondary: '#6B7280',
      muted: '#9CA3AF',
    }
  },
  radius: {
    card: '28px',
    badge: '6px',
    button: '10px',
  },
  shadow: {
    card: '0 4px 20px -4px rgba(0,0,0,0.1)',
    cardHover: '0 8px 30px -4px rgba(0,0,0,0.15)',
    yourMove: '0 4px 20px rgba(220, 38, 38, 0.12)',
  },
  font: {
    display: 'var(--font-dm-sans), system-ui, sans-serif',
    body: 'var(--font-dm-sans), system-ui, sans-serif',
  }
};

type LeadBucket = 'yourMove' | 'aiHandling' | 'handled' | 'spam';

// ============================================================
// BUCKET BADGE
// ============================================================

const BucketBadge = ({ bucket, subtext }: { bucket: LeadBucket; subtext?: string | null }) => {
  const config = {
    yourMove: {
      label: 'YOUR MOVE',
      colors: tokens.colors.yourMove,
      icon: AlertCircle,
    },
    aiHandling: {
      label: 'AI HANDLING',
      colors: tokens.colors.aiHandling,
      icon: Bot,
    },
    handled: {
      label: 'HANDLED',
      colors: tokens.colors.handled,
      icon: CheckCircle2,
    },
    spam: {
      label: 'FILTERED',
      colors: tokens.colors.spam,
      icon: null,
    }
  };

  const { label, colors, icon: Icon } = config[bucket];

  return (
    <div className="flex items-center gap-2">
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          background: colors.badge,
          borderRadius: tokens.radius.badge,
          color: '#FFFFFF',
          fontSize: '11px',
          fontWeight: '600',
          letterSpacing: '0.5px',
          fontFamily: tokens.font.display,
        }}
      >
        {Icon && <Icon size={12} />}
        {label}
      </div>
      {subtext && (
        <span
          style={{
            fontSize: '12px',
            color: tokens.colors.text.secondary,
            fontFamily: tokens.font.body,
          }}
        >
          {subtext}
        </span>
      )}
    </div>
  );
};

// ============================================================
// CONTEXT BOX
// ============================================================

const ContextBox = ({ bucket, children, icon: Icon }: { bucket: LeadBucket; children: React.ReactNode; icon?: any }) => {
  const colors = tokens.colors[bucket];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        padding: '12px 14px',
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: '10px',
        marginTop: '12px',
      }}
    >
      {Icon && (
        <Icon
          size={16}
          style={{
            color: colors.accent,
            marginTop: '2px',
            flexShrink: 0,
          }}
        />
      )}
      <div
        style={{
          fontSize: '13px',
          lineHeight: '1.5',
          color: tokens.colors.text.primary,
          fontFamily: tokens.font.body,
        }}
      >
        {children}
      </div>
    </div>
  );
};

// ============================================================
// ACTION BUTTON
// ============================================================

const ActionButton = ({
  bucket,
  label,
  icon: Icon,
  onClick,
  secondary = false
}: {
  bucket: LeadBucket;
  label: string;
  icon?: any;
  onClick?: (e: React.MouseEvent) => void;
  secondary?: boolean
}) => {
  const colors = tokens.colors[bucket];

  if (secondary) {
    return (
      <button
        onClick={onClick}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          padding: '10px 16px',
          background: 'transparent',
          border: `1px solid ${tokens.colors.text.muted}`,
          borderRadius: tokens.radius.button,
          color: tokens.colors.text.secondary,
          fontSize: '14px',
          fontWeight: '500',
          fontFamily: tokens.font.body,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        {Icon && <Icon size={16} />}
        {label}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '12px 20px',
        background: colors.accent,
        border: 'none',
        borderRadius: tokens.radius.button,
        color: '#FFFFFF',
        fontSize: '15px',
        fontWeight: '600',
        fontFamily: tokens.font.body,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        boxShadow: `0 2px 8px ${colors.accent}33`,
      }}
    >
      {Icon && <Icon size={18} />}
      {label}
    </button>
  );
};

// ============================================================
// UTILITIES
// ============================================================

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isToday(date)) {
      return format(date, 'h:mm a');
    }
    return format(date, 'MMM d, h:mm a');
  } catch {
    return '';
  }
}

function getLeadBucket(lead: Lead): LeadBucket {
  if (lead.priority_color === 'gray' || lead.status === 'lost') return 'spam';
  if (lead.status === 'converted' || lead.converted_job_id) return 'handled';
  if (lead.priority_color === 'red' || lead.revenue_tier === 'replacement' || lead.urgency === 'emergency') return 'yourMove';
  if (lead.status === 'voicemail_left' || lead.status === 'deferred') return 'aiHandling';
  return 'aiHandling'; // Default
}

// ============================================================
// LEAD CARD v4 (Updated to v5 design)
// ============================================================

interface LeadCardV4Props {
  lead: LeadWithNotes;
  onCall?: (lead: Lead) => void;
  onSms?: (lead: Lead) => void;
  onPlay?: (lead: Lead) => void;
  onArchive?: (lead: Lead) => void;
  onBook?: (lead: Lead) => void;
  onAddNote?: (lead: Lead) => void;
  onMarkSpam?: (lead: Lead) => void;
  onClick?: (lead: Lead) => void;
  showExpandedByDefault?: boolean;
  hidePriorityBadge?: boolean;
  className?: string;
}

export function LeadCardV4({
  lead,
  onCall,
  onSms,
  onPlay,
  onArchive,
  onBook,
  onAddNote,
  onMarkSpam,
  onClick,
  showExpandedByDefault = false,
  className,
}: LeadCardV4Props) {
  const [expanded, setExpanded] = useState(showExpandedByDefault);

  const bucket = getLeadBucket(lead);
  const colors = tokens.colors[bucket];

  const cardShadow = bucket === 'yourMove'
    ? tokens.shadow.yourMove
    : tokens.shadow.card;

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCall) onCall(lead);
    else window.location.href = `tel:${lead.customer_phone}`;
  };

  const handleBook = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onBook) onBook(lead);
  };

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPlay) onPlay(lead);
  };

  // Logic for context message based on status/priority
  let contextIcon = AlertCircle;
  let contextMessage: React.ReactNode = null;

  if (bucket === 'yourMove') {
    if (lead.priority_color === 'red') {
      contextIcon = AlertCircle;
      contextMessage = (
        <>
          <strong>Action Required:</strong> {lead.priority_reason || 'Frustrated customer or repeat issue needs human intervention.'}
        </>
      );
    } else if (lead.revenue_tier === 'replacement') {
      contextIcon = AlertCircle;
      contextMessage = (
        <>
          <strong>High Value Lead:</strong> Potential replacement inquiry. Customer wants a quote.
        </>
      );
    } else if (lead.urgency === 'emergency') {
      contextIcon = AlertCircle;
      contextMessage = (
        <>
          <strong>Emergency:</strong> Rapid response requested for {lead.issue_description || 'urgent issue'}.
        </>
      );
    }
  } else if (bucket === 'aiHandling') {
    if (lead.status === 'voicemail_left') {
      contextIcon = Bot;
      contextMessage = (
        <>
          <strong>AI Left Voicemail.</strong> Monitoring for return call. You can jump in and call now.
        </>
      );
    } else {
      contextIcon = RotateCcw;
      contextMessage = (
        <>
          <strong>AI is following up.</strong> Sequence in progress. No immediate action needed.
        </>
      );
    }
  } else if (bucket === 'handled') {
    contextIcon = CheckCircle2;
    contextMessage = (
      <>
        <strong>Handled.</strong> Lead converted to job or resolved.
      </>
    );
  } else if (bucket === 'spam') {
    contextMessage = <><strong>Filtered.</strong> Marked as spam or vendor solicitation.</>;
  }

  return (
    <div
      onClick={() => onClick?.(lead)}
      className={cn("w-full transition-all duration-200", className)}
      style={{
        background: tokens.colors.surface,
        borderRadius: tokens.radius.card,
        border: `1px solid ${colors.border}`,
        boxShadow: cardShadow,
        overflow: 'hidden',
        fontFamily: tokens.font.body,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {/* Main Card Content */}
      <div style={{ padding: '16px 18px' }}>

        {/* Row 1: Bucket Badge + Time */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
        }}>
          <BucketBadge
            bucket={bucket}
            subtext={lead.urgency === 'high' || lead.urgency === 'emergency' ? 'Priority' : null}
          />
          <span style={{
            fontSize: '12px',
            color: tokens.colors.text.muted,
          }}>
            {formatTimeAgo(lead.created_at)}
          </span>
        </div>

        {/* Row 1.5: Quick-Scan Bar (HVAC Must-Have Info) */}
        {(lead.property_type || lead.system_status || lead.equipment_age_bracket || lead.is_decision_maker !== null) && (
          <div style={{ marginBottom: '10px' }}>
            <QuickScanBar
              propertyType={lead.property_type}
              systemStatus={lead.system_status}
              equipmentAgeBracket={lead.equipment_age_bracket}
              isDecisionMaker={lead.is_decision_maker}
              decisionMakerContact={lead.decision_maker_contact}
              compact
            />
          </div>
        )}

        {/* Row 2: Problem Headline */}
        <h3 style={{
          margin: '0 0 4px 0',
          fontSize: '17px',
          fontWeight: '600',
          color: tokens.colors.text.primary,
          fontFamily: tokens.font.display,
          lineHeight: '1.3',
        }}>
          {lead.issue_description || 'Inbound service request'}
        </h3>

        {/* Row 3: Customer + Location (compressed) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '13px',
          color: tokens.colors.text.secondary,
          marginBottom: '4px',
        }}>
          <span style={{ fontWeight: '500' }}>{lead.customer_name}</span>
          {lead.customer_address && (
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}>
              <MapPin size={12} />
              {lead.customer_address.split(',')[0]}
            </span>
          )}
        </div>

        {/* Row 4: Context Box */}
        {contextMessage && (
          <ContextBox bucket={bucket} icon={contextIcon}>
            {contextMessage}
          </ContextBox>
        )}

        {/* Expandable Details */}
        {expanded && (
          <div style={{
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: `1px solid ${tokens.colors.text.muted}22`,
          }}>
            <div style={{
              fontSize: '13px',
              color: tokens.colors.text.secondary,
              marginBottom: '12px',
            }}>
              <strong style={{ color: tokens.colors.text.primary }}>Address:</strong>{' '}
              {lead.customer_address || 'Unknown'}
            </div>

            <div style={{
              fontSize: '13px',
              color: tokens.colors.text.secondary,
              marginBottom: '12px',
            }}>
              <strong style={{ color: tokens.colors.text.primary }}>Phone:</strong>{' '}
              {lead.customer_phone}
            </div>

            {lead.ai_summary && (
              <div style={{
                fontSize: '13px',
                color: tokens.colors.text.secondary,
                padding: '12px',
                background: '#F9FAFB',
                borderRadius: '8px',
                lineHeight: '1.5',
              }}>
                <strong style={{
                  color: tokens.colors.text.primary,
                  display: 'block',
                  marginBottom: '6px',
                }}>
                  AI Call Summary
                </strong>
                {lead.ai_summary}
              </div>
            )}
          </div>
        )}

        {/* Row 5: Actions */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '16px',
          paddingTop: '14px',
          borderTop: `1px solid ${tokens.colors.text.muted}22`,
        }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {bucket === 'yourMove' ? (
              <>
                <ActionButton
                  bucket={bucket}
                  label="Call Now"
                  icon={Phone}
                  onClick={handleCall}
                />
                <ActionButton
                  bucket={bucket}
                  label="Book"
                  icon={Calendar}
                  onClick={handleBook}
                  secondary
                />
              </>
            ) : bucket === 'aiHandling' ? (
              <>
                <ActionButton
                  bucket={bucket}
                  label="Call Now"
                  icon={Phone}
                  onClick={handleCall}
                />
                {onPlay && (
                  <button
                    onClick={handlePlay}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px',
                      color: tokens.colors.text.muted,
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <Volume2 size={20} />
                  </button>
                )}
              </>
            ) : bucket === 'handled' ? (
              <>
                <ActionButton
                  bucket={bucket}
                  label="Call"
                  icon={Phone}
                  onClick={handleCall}
                  secondary
                />
                {onPlay && (
                  <ActionButton
                    bucket={bucket}
                    label="Play Call"
                    icon={Volume2}
                    onClick={handlePlay}
                    secondary
                  />
                )}
              </>
            ) : (
              <ActionButton
                bucket={bucket}
                label="Archive"
                icon={Archive}
                onClick={(e) => {
                  e.stopPropagation();
                  onArchive?.(lead);
                }}
                secondary
              />
            )}

            <MoreMenu
              onArchive={() => onArchive?.(lead)}
              onAddNote={() => onAddNote?.(lead)}
              onMarkSpam={() => onMarkSpam?.(lead)}
              className="w-10 h-10 border-none bg-transparent hover:bg-gray-100 rounded-full"
            />
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '8px 12px',
              background: 'transparent',
              border: 'none',
              color: tokens.colors.text.muted,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            {expanded ? 'Less' : 'More'}
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}

// Keeping empty state for compatibility
export function ActionEmptyState({ totalCalls = 0, aiBooked = 0 }: { totalCalls?: number; aiBooked?: number }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
        <CheckCircle2 className="w-8 h-8 text-emerald-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">All caught up!</h3>
      {(totalCalls > 0 || aiBooked > 0) && (
        <div className="text-sm text-gray-500 mb-4 space-y-1">
          {totalCalls > 0 && (
            <p>
              <span className="font-semibold text-slate-900">{totalCalls}</span>{' '}
              {totalCalls === 1 ? 'call' : 'calls'} handled by AI
            </p>
          )}
          {aiBooked > 0 && (
            <p>
              <span className="font-semibold text-emerald-600">{aiBooked}</span>{' '}
              {aiBooked === 1 ? 'appointment' : 'appointments'} booked automatically
            </p>
          )}
        </div>
      )}
      <a
        href="/history"
        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
      >
        View History
        <ChevronUp className="w-4 h-4 rotate-90" />
      </a>
    </div>
  );
}
