'use client';

import { cn } from '@/lib/utils';

export type AvatarStyle = 'burst' | 'organic' | 'geometric' | 'circuit';

interface ProfileAvatarProps {
  name: string;
  style: AvatarStyle;
  size?: number;
  className?: string;
}

// Background colors per archetype
const BG_COLORS: Record<AvatarStyle, string> = {
  burst: 'dc2626',    // red (hazard)
  organic: '475569',  // slate (recovery)
  geometric: 'd97706', // amber (revenue)
  circuit: '0284c7',  // blue (logistics)
};

export function ProfileAvatar({
  name,
  style,
  size = 44,
  className,
}: ProfileAvatarProps) {
  const bgColor = BG_COLORS[style];

  // Build oxro.io avatar URL
  const url = `https://avatar.oxro.io/avatar.svg?name=${encodeURIComponent(name || 'User')}&background=${bgColor}&color=fff&bold=true&length=2&caps=1&width=${size * 2}&height=${size * 2}`;

  return (
    <img
      src={url}
      alt={`Avatar for ${name}`}
      width={size}
      height={size}
      className={cn('rounded-full', className)}
      style={{ width: size, height: size }}
    />
  );
}
