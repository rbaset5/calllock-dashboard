'use client';

import { Phone, MessageSquare, Navigation } from 'lucide-react';
import { phoneHref, formatPhone } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface QuickActionsProps {
  phone: string;
  address?: string | null;
  onCallClick?: () => void;
  className?: string;
}

/**
 * Quick action buttons for one-tap contact
 * Horizontal row: Call, Text, Navigate
 * Designed for 48px touch targets
 */
export function QuickActions({
  phone,
  address,
  onCallClick,
  className,
}: QuickActionsProps) {
  const handleCallClick = () => {
    onCallClick?.();
    // After callback, the href will navigate to phone dialer
  };

  const handleNavigateClick = () => {
    if (!address) return;
    // Open in Google Maps or Apple Maps based on platform
    const encodedAddress = encodeURIComponent(address);
    const mapsUrl = `https://maps.google.com/maps?q=${encodedAddress}`;
    window.open(mapsUrl, '_blank');
  };

  const handleTextClick = () => {
    // Open SMS compose with phone number
    window.location.href = `sms:${phone}`;
  };

  return (
    <div className={cn('grid grid-cols-3 gap-2', className)}>
      {/* Call Button - Primary */}
      <a
        href={phoneHref(phone)}
        onClick={handleCallClick}
        className={cn(
          'flex flex-col items-center justify-center gap-1 p-3 rounded-lg',
          'bg-navy-600 text-white',
          'hover:bg-navy-700 active:bg-navy-800 transition-colors',
          'min-h-[60px]'
        )}
      >
        <Phone className="w-5 h-5" />
        <span className="text-sm font-medium">Call</span>
      </a>

      {/* Text Button - Secondary */}
      <button
        type="button"
        onClick={handleTextClick}
        className={cn(
          'flex flex-col items-center justify-center gap-1 p-3 rounded-lg',
          'bg-gray-100 text-gray-700',
          'hover:bg-gray-200 active:bg-gray-300 transition-colors',
          'min-h-[60px]'
        )}
      >
        <MessageSquare className="w-5 h-5" />
        <span className="text-sm font-medium">Text</span>
      </button>

      {/* Navigate Button - Secondary */}
      <button
        type="button"
        onClick={handleNavigateClick}
        disabled={!address}
        className={cn(
          'flex flex-col items-center justify-center gap-1 p-3 rounded-lg',
          'transition-colors min-h-[60px]',
          address
            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
            : 'bg-gray-50 text-gray-300 cursor-not-allowed'
        )}
      >
        <Navigation className="w-5 h-5" />
        <span className="text-sm font-medium">Navigate</span>
      </button>
    </div>
  );
}

/**
 * Compact inline version for tighter layouts
 */
export function QuickActionsCompact({
  phone,
  address,
  onCallClick,
  className,
}: QuickActionsProps) {
  const handleCallClick = () => {
    onCallClick?.();
  };

  const handleNavigateClick = () => {
    if (!address) return;
    const encodedAddress = encodeURIComponent(address);
    const mapsUrl = `https://maps.google.com/maps?q=${encodedAddress}`;
    window.open(mapsUrl, '_blank');
  };

  const handleTextClick = () => {
    window.location.href = `sms:${phone}`;
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Call */}
      <a
        href={phoneHref(phone)}
        onClick={handleCallClick}
        className={cn(
          'flex items-center gap-2 px-4 py-2.5 rounded-lg',
          'bg-navy-600 text-white',
          'hover:bg-navy-700 active:bg-navy-800 transition-colors'
        )}
      >
        <Phone className="w-4 h-4" />
        <span className="text-sm font-medium">{formatPhone(phone)}</span>
      </a>

      {/* Text */}
      <button
        type="button"
        onClick={handleTextClick}
        className={cn(
          'p-2.5 rounded-lg',
          'bg-gray-100 text-gray-700',
          'hover:bg-gray-200 active:bg-gray-300 transition-colors'
        )}
        title="Send text message"
      >
        <MessageSquare className="w-4 h-4" />
      </button>

      {/* Navigate */}
      {address && (
        <button
          type="button"
          onClick={handleNavigateClick}
          className={cn(
            'p-2.5 rounded-lg',
            'bg-gray-100 text-gray-700',
            'hover:bg-gray-200 active:bg-gray-300 transition-colors'
          )}
          title="Navigate to address"
        >
          <Navigation className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default QuickActions;
