import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        // Custom variants for backwards compatibility
        success: "border-transparent bg-green-100 text-green-700",
        warning: "border-transparent bg-yellow-100 text-yellow-700",
        error: "border-transparent bg-red-100 text-red-700",
        info: "border-transparent bg-blue-100 text-blue-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

// Status badge with predefined colors
function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    new: { label: 'New', variant: 'info' },
    confirmed: { label: 'Confirmed', variant: 'secondary' },
    en_route: { label: 'En Route', variant: 'warning' },
    on_site: { label: 'On Site', variant: 'warning' },
    complete: { label: 'Complete', variant: 'success' },
    cancelled: { label: 'Cancelled', variant: 'error' },
  };

  const config = statusConfig[status] || { label: status, variant: 'secondary' as const };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

// Urgency badge with predefined colors
function UrgencyBadge({ urgency }: { urgency: string }) {
  const urgencyConfig: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    low: { label: 'Low', variant: 'secondary' },
    medium: { label: 'Medium', variant: 'info' },
    high: { label: 'High', variant: 'warning' },
    emergency: { label: 'Emergency', variant: 'error' },
  };

  const config = urgencyConfig[urgency] || { label: urgency, variant: 'secondary' as const };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

// Service type badge
function ServiceTypeBadge({ type }: { type: string }) {
  const label = type === 'hvac' ? 'HVAC' : type.charAt(0).toUpperCase() + type.slice(1);
  return <Badge variant="secondary">{label}</Badge>;
}

// Lead status badge with predefined colors
type LeadStatus = 'callback_requested' | 'thinking' | 'voicemail_left' | 'info_only' | 'deferred' | 'converted' | 'lost' | 'abandoned' | 'sales_opportunity';

function LeadStatusBadge({ status }: { status: LeadStatus | string }) {
  const statusConfig: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    callback_requested: { label: 'Callback Requested', variant: 'warning' },
    thinking: { label: 'Thinking', variant: 'info' },
    voicemail_left: { label: 'Voicemail Left', variant: 'secondary' },
    info_only: { label: 'Info Only', variant: 'secondary' },
    deferred: { label: 'Snoozed', variant: 'info' },
    converted: { label: 'Converted', variant: 'success' },
    lost: { label: 'Lost', variant: 'error' },
    abandoned: { label: 'Missed Call', variant: 'error' },
    sales_opportunity: { label: 'Sales Opportunity', variant: 'warning' },
  };

  const config = statusConfig[status] || { label: status, variant: 'secondary' as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

// Lead priority badge with visual indicator
type LeadPriority = 'hot' | 'warm' | 'cold';

function LeadPriorityBadge({ priority }: { priority: LeadPriority | string }) {
  const priorityConfig: Record<string, { label: string; className: string }> = {
    hot: { label: 'Hot', className: 'bg-red-100 text-red-700 border-red-200' },
    warm: { label: 'Warm', className: 'bg-orange-100 text-orange-700 border-orange-200' },
    cold: { label: 'Cold', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  };

  const config = priorityConfig[priority] || { label: priority, className: 'bg-gray-100 text-gray-600 border-gray-200' };

  return (
    <span className={cn(
      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
      config.className
    )}>
      {config.label}
    </span>
  );
}

// Revenue tier badge with dollar signs and colors
type RevenueTier = '$$$$' | '$$$' | '$$' | '$' | '$$?';

interface RevenueTierConfig {
  symbol: string;
  label: string;
  range: string;
  className: string;
}

const REVENUE_TIER_CONFIG: Record<RevenueTier, RevenueTierConfig> = {
  '$$$$': { symbol: '$$$$', label: 'Potential Replacement', range: '$5,000 - $15,000+', className: 'bg-red-100 text-red-700 border-red-200' },
  '$$$': { symbol: '$$$', label: 'Major Repair', range: '$800 - $3,000', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  '$$': { symbol: '$$', label: 'Standard Repair', range: '$200 - $800', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  '$': { symbol: '$', label: 'Maintenance', range: '$75 - $250', className: 'bg-green-100 text-green-700 border-green-200' },
  '$$?': { symbol: '$$?', label: 'Diagnostic', range: '$99', className: 'bg-gray-100 text-gray-600 border-gray-200' },
};

function RevenueTierBadge({ tier }: { tier: RevenueTier | string | null | undefined }) {
  const config = REVENUE_TIER_CONFIG[tier as RevenueTier] || REVENUE_TIER_CONFIG['$$?'];

  return (
    <span className={cn(
      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold",
      config.className
    )}>
      {config.symbol}
    </span>
  );
}

// Helper to get full revenue tier info
function getRevenueTierInfo(tier: RevenueTier | string | null | undefined): RevenueTierConfig {
  return REVENUE_TIER_CONFIG[tier as RevenueTier] || REVENUE_TIER_CONFIG['$$?'];
}

// Alert status badge for SMS alerts
type AlertStatus = 'pending' | 'replied' | 'resolved' | 'expired';

function AlertStatusBadge({ status }: { status: AlertStatus | string }) {
  const statusConfig: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    pending: { label: 'Pending', variant: 'warning' },
    replied: { label: 'Replied', variant: 'info' },
    resolved: { label: 'Resolved', variant: 'success' },
    expired: { label: 'Expired', variant: 'secondary' },
  };

  const config = statusConfig[status] || { label: status, variant: 'secondary' as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

// Alert type badge (emergency vs sales lead)
type AlertType = 'emergency' | 'sales_lead' | 'abandoned_call';

function AlertTypeBadge({ type }: { type: AlertType | string }) {
  const typeConfig: Record<string, { label: string; emoji: string; variant: BadgeProps['variant'] }> = {
    emergency: { label: 'Emergency', emoji: '🚨', variant: 'error' },
    sales_lead: { label: 'Sales Lead', emoji: '💰', variant: 'warning' },
    abandoned_call: { label: 'Missed Call', emoji: '📵', variant: 'secondary' },
  };

  const config = typeConfig[type] || { label: type, emoji: '📋', variant: 'secondary' as const };
  return (
    <Badge variant={config.variant} className="gap-1">
      <span>{config.emoji}</span>
      <span>{config.label}</span>
    </Badge>
  );
}

// Reply code badge showing dispatcher action
type AlertReplyCode = '1' | '2' | '3' | '4' | '5';

function AlertReplyBadge({ code, label }: { code: AlertReplyCode | string | null; label: string | null }) {
  if (!code || !label) return null;

  const codeConfig: Record<string, { variant: BadgeProps['variant'] }> = {
    '1': { variant: 'info' }, // Called
    '2': { variant: 'secondary' }, // Left VM
    '3': { variant: 'secondary' }, // Note
    '4': { variant: 'success' }, // Booked
    '5': { variant: 'error' }, // Lost
  };

  const config = codeConfig[code] || { variant: 'secondary' as const };
  return <Badge variant={config.variant}>✓ {label}</Badge>;
}

// Revenue confidence indicator - visual dots showing AI confidence level
type RevenueConfidence = 'low' | 'medium' | 'high';

interface ConfidenceIndicatorConfig {
  icon: string;
  label: string;
  className: string;
}

const CONFIDENCE_CONFIG: Record<RevenueConfidence, ConfidenceIndicatorConfig> = {
  high: { icon: '●●●', label: 'High confidence', className: 'bg-green-100 text-green-700' },
  medium: { icon: '●●○', label: 'Medium confidence', className: 'bg-yellow-100 text-yellow-700' },
  low: { icon: '●○○', label: 'Low confidence', className: 'bg-gray-100 text-gray-500' },
};

function ConfidenceIndicator({ confidence, showLabel = false }: { confidence: RevenueConfidence | string | null | undefined; showLabel?: boolean }) {
  if (!confidence) return null;

  const config = CONFIDENCE_CONFIG[confidence as RevenueConfidence];
  if (!config) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded",
        config.className
      )}
      title={config.label}
    >
      <span className="font-mono text-[10px] tracking-tight">{config.icon}</span>
      {showLabel && <span className="text-[10px]">{confidence}</span>}
    </span>
  );
}

export {
  Badge,
  badgeVariants,
  StatusBadge,
  UrgencyBadge,
  ServiceTypeBadge,
  LeadStatusBadge,
  LeadPriorityBadge,
  RevenueTierBadge,
  getRevenueTierInfo,
  AlertStatusBadge,
  AlertTypeBadge,
  AlertReplyBadge,
  ConfidenceIndicator,
  REVENUE_TIER_CONFIG,
  CONFIDENCE_CONFIG,
  type RevenueTier,
  type RevenueTierConfig,
  type LeadStatus,
  type LeadPriority,
  type AlertStatus,
  type AlertType,
  type AlertReplyCode,
  type RevenueConfidence,
}
