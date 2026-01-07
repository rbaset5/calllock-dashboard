import type { Lead, Job, UrgencyLevel, PriorityColor } from '@/types/database';

export type UrgencyTier =
  | 'emergency'
  | 'callback_risk'
  | 'hot'
  | 'warm'
  | 'follow_up'
  | 'getting_cold'
  | 'confirm_booking';

export interface UrgencyConfig {
  label: string;
  icon: string;
  bgColor: string;
  textColor: string;
  animate?: boolean;
}

export const URGENCY_CONFIG: Record<UrgencyTier, UrgencyConfig> = {
  emergency: {
    label: 'EMERGENCY',
    icon: 'warning',
    bgColor: 'bg-red-500',
    textColor: 'text-white',
    animate: true,
  },
  callback_risk: {
    label: 'CALLBACK RISK',
    icon: 'priority_high',
    bgColor: 'bg-slate-800',
    textColor: 'text-white',
  },
  hot: {
    label: 'HOT',
    icon: 'local_fire_department',
    bgColor: 'bg-orange-500',
    textColor: 'text-white',
  },
  warm: {
    label: 'WARM',
    icon: 'schedule',
    bgColor: 'bg-amber-400',
    textColor: 'text-amber-900',
  },
  follow_up: {
    label: 'FOLLOW UP',
    icon: 'phone_callback',
    bgColor: 'bg-blue-500',
    textColor: 'text-white',
  },
  getting_cold: {
    label: 'GETTING COLD',
    icon: 'ac_unit',
    bgColor: 'bg-gray-400',
    textColor: 'text-white',
  },
  confirm_booking: {
    label: 'CONFIRM BOOKING',
    icon: 'event_available',
    bgColor: 'bg-yellow-400',
    textColor: 'text-yellow-900',
  },
};

type ItemWithUrgency = { urgency?: UrgencyLevel | null };
type ItemWithPriorityColor = { priority_color?: PriorityColor | null };
type ItemWithAIBooked = { is_ai_booked?: boolean; booking_confirmed?: boolean };
type ItemWithCreatedAt = { created_at: string };

export type UrgencyItem = (Lead | Job) & ItemWithCreatedAt;

export function determineUrgencyTier(
  item: UrgencyItem,
  gettingColdThresholdHours: number = 24
): UrgencyTier {
  const isAiBooked = (item as ItemWithAIBooked).is_ai_booked;
  const bookingConfirmed = (item as ItemWithAIBooked).booking_confirmed;
  if (isAiBooked && !bookingConfirmed) {
    return 'confirm_booking';
  }

  const urgency = (item as ItemWithUrgency).urgency;
  if (urgency === 'emergency' || urgency === 'high') {
    return 'emergency';
  }

  const priorityColor = (item as ItemWithPriorityColor).priority_color;
  if (priorityColor === 'red') {
    return 'callback_risk';
  }

  const createdAt = new Date(item.created_at);
  const minutesOld = (Date.now() - createdAt.getTime()) / (1000 * 60);
  const hoursOld = minutesOld / 60;

  if (minutesOld < 15) {
    return 'hot';
  }

  if (hoursOld < 2) {
    return 'warm';
  }

  if (hoursOld < gettingColdThresholdHours) {
    return 'follow_up';
  }

  return 'getting_cold';
}

export function getMinutesOld(createdAt: string): number {
  return (Date.now() - new Date(createdAt).getTime()) / (1000 * 60);
}

export function formatTimeAgo(createdAt: string): string {
  const minutesOld = getMinutesOld(createdAt);

  if (minutesOld < 1) {
    return 'JUST NOW';
  }

  if (minutesOld < 60) {
    const mins = Math.floor(minutesOld);
    return `${mins} MIN${mins !== 1 ? 'S' : ''} AGO`;
  }

  const hoursOld = minutesOld / 60;
  if (hoursOld < 24) {
    const hrs = Math.floor(hoursOld);
    return `${hrs} HOUR${hrs !== 1 ? 'S' : ''} AGO`;
  }

  const daysOld = Math.floor(hoursOld / 24);
  return `${daysOld} DAY${daysOld !== 1 ? 'S' : ''} AGO`;
}

const BASE_SCORES: Record<UrgencyTier, number> = {
  emergency: 1000,
  callback_risk: 900,
  confirm_booking: 750,
  hot: 800,
  warm: 600,
  follow_up: 400,
  getting_cold: 200,
};

export function calculateUrgencyScore(tier: UrgencyTier, minutesOld: number): number {
  let score = BASE_SCORES[tier];
  score += Math.min(minutesOld * 0.1, 50);
  return score;
}

export function isUrgent(tier: UrgencyTier): boolean {
  return tier === 'emergency' || tier === 'callback_risk' || tier === 'hot';
}

export function sortByUrgency<T extends UrgencyItem>(
  items: T[],
  gettingColdThresholdHours: number = 24
): T[] {
  return [...items].sort((a, b) => {
    const tierA = determineUrgencyTier(a, gettingColdThresholdHours);
    const tierB = determineUrgencyTier(b, gettingColdThresholdHours);
    const minutesA = getMinutesOld(a.created_at);
    const minutesB = getMinutesOld(b.created_at);
    const scoreA = calculateUrgencyScore(tierA, minutesA);
    const scoreB = calculateUrgencyScore(tierB, minutesB);
    return scoreB - scoreA;
  });
}

export function countByUrgencyTier<T extends UrgencyItem>(
  items: T[],
  gettingColdThresholdHours: number = 24
): Record<UrgencyTier, number> & { total: number; urgent: number } {
  const counts: Record<UrgencyTier, number> = {
    emergency: 0,
    callback_risk: 0,
    hot: 0,
    warm: 0,
    follow_up: 0,
    getting_cold: 0,
    confirm_booking: 0,
  };

  for (const item of items) {
    const tier = determineUrgencyTier(item, gettingColdThresholdHours);
    counts[tier]++;
  }

  return {
    ...counts,
    total: items.length,
    urgent: counts.emergency + counts.callback_risk + counts.hot,
  };
}
