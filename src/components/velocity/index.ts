/**
 * Velocity Triage System Components
 *
 * Export all velocity-related components and types.
 */

// Main factory component
export { VelocityCardFactory, VelocityCard } from './velocity-card-factory';

// Individual archetype cards
export { HazardCard } from './hazard-card';
export { RevenueCard } from './revenue-card';
export { RecoveryCard } from './recovery-card';
export { LogisticsCard } from './logistics-card';

// Sub-components
export { SlideToDispatch } from './slide-to-dispatch';

// Types
export type { VelocityItem, VelocityCardProps, VelocityCardHandlers } from './types';
