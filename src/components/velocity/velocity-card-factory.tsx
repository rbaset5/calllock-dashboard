'use client';

/**
 * VelocityCardFactory Component
 *
 * Routes to the appropriate velocity card based on the item's archetype.
 * This is the main entry point for rendering velocity cards.
 */

import { determineArchetype } from '@/lib/velocity';
import { HazardCard } from './hazard-card';
import { RevenueCard } from './revenue-card';
import { RecoveryCard } from './recovery-card';
import { LogisticsCard } from './logistics-card';
import type { VelocityCardHandlers, VelocityItem, SnoozeDuration } from './types';

interface VelocityCardFactoryProps extends VelocityCardHandlers {
  data: VelocityItem;
  className?: string;
}

export function VelocityCardFactory({
  data,
  onCall,
  onDispatch,
  onBook,
  onArchive,
  onNavigate,
  onPlay,
  onAddNote,
  onSnooze,
  onMarkLost,
  className,
}: VelocityCardFactoryProps) {
  // Determine archetype to route to correct card
  const archetype = determineArchetype(data);

  // Common props for all cards
  const cardProps = {
    data,
    onCall,
    onDispatch,
    onBook,
    onArchive,
    onNavigate,
    onPlay,
    onAddNote,
    onSnooze,
    onMarkLost,
    className,
  };

  // Route to archetype-specific card
  switch (archetype) {
    case 'HAZARD':
      return <HazardCard {...cardProps} />;
    case 'REVENUE':
      return <RevenueCard {...cardProps} />;
    case 'RECOVERY':
      return <RecoveryCard {...cardProps} />;
    case 'LOGISTICS':
    default:
      return <LogisticsCard {...cardProps} />;
  }
}

/**
 * VelocityCard - Alias for VelocityCardFactory
 * Use this if you prefer a shorter name.
 */
export const VelocityCard = VelocityCardFactory;
