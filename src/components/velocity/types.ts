/**
 * Shared types for Velocity Card components
 */

import type { Lead, Job } from '@/types/database';

export type VelocityItem = Lead | Job;

/**
 * Snooze duration options for the MoreMenu
 */
export type SnoozeDuration = '1h' | '3h' | 'tomorrow';

export interface VelocityCardHandlers {
  onCall?: (phone: string) => void;
  onDispatch?: (item: VelocityItem) => void;
  onBook?: (item: VelocityItem) => void;
  onArchive?: (item: VelocityItem) => void;
  onNavigate?: (address: string) => void;
  onPlay?: (item: VelocityItem) => void;
  onAddNote?: (item: VelocityItem) => void;
  onSnooze?: (item: VelocityItem, duration: SnoozeDuration) => void;
  onMarkLost?: (item: VelocityItem) => void;
}

export interface VelocityCardProps extends VelocityCardHandlers {
  data: VelocityItem;
  className?: string;
}
