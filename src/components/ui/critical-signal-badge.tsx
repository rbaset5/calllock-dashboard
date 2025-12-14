import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CriticalSignalBadgeProps {
  signal: string;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Optional additional className */
  className?: string;
}

/**
 * Warning-styled badge for critical revenue signals
 * (R-22, Freon, obsolete refrigerant)
 *
 * These signals indicate $10k+ replacement opportunities
 * and need to stand out from normal signals.
 */
export function CriticalSignalBadge({
  signal,
  size = 'sm',
  className,
}: CriticalSignalBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded font-medium',
        'bg-orange-100 text-orange-800 border border-orange-200',
        size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm',
        className
      )}
    >
      <AlertTriangle className={cn(size === 'sm' ? 'w-3 h-3' : 'w-4 h-4')} />
      {signal}
    </span>
  );
}

/**
 * Normal signal badge (for comparison/inline use)
 */
export function SignalBadge({
  signal,
  size = 'sm',
  className,
}: {
  signal: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded',
        'bg-gray-100 text-gray-600',
        size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm',
        className
      )}
    >
      {signal}
    </span>
  );
}
