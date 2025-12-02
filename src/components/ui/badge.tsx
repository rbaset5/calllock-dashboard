import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  error: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
};

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

// Status badge with predefined colors
export function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; variant: BadgeVariant }> = {
    new: { label: 'New', variant: 'info' },
    confirmed: { label: 'Confirmed', variant: 'default' },
    en_route: { label: 'En Route', variant: 'warning' },
    on_site: { label: 'On Site', variant: 'warning' },
    complete: { label: 'Complete', variant: 'success' },
    cancelled: { label: 'Cancelled', variant: 'error' },
  };

  const config = statusConfig[status] || { label: status, variant: 'default' as BadgeVariant };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

// Urgency badge with predefined colors
export function UrgencyBadge({ urgency }: { urgency: string }) {
  const urgencyConfig: Record<string, { label: string; variant: BadgeVariant }> = {
    low: { label: 'Low', variant: 'default' },
    medium: { label: 'Medium', variant: 'info' },
    high: { label: 'High', variant: 'warning' },
    emergency: { label: 'Emergency', variant: 'error' },
  };

  const config = urgencyConfig[urgency] || { label: urgency, variant: 'default' as BadgeVariant };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

// Service type badge
export function ServiceTypeBadge({ type }: { type: string }) {
  const label = type === 'hvac' ? 'HVAC' : type.charAt(0).toUpperCase() + type.slice(1);
  return <Badge variant="default">{label}</Badge>;
}
