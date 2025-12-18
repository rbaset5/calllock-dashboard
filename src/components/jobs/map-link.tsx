'use client';

import { ReactNode } from 'react';
import { Navigation, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getMapUrl, getWazeUrl } from '@/lib/utils';
import { cn } from '@/lib/utils';

export interface MapLinkProps {
  address: string;
  children?: ReactNode;
  className?: string;
}

export function MapLink({ address, children, className }: MapLinkProps) {
  function openMaps() {
    window.open(getMapUrl(address), '_blank');
  }

  function openWaze() {
    window.open(getWazeUrl(address), '_blank');
  }

  // If children provided, wrap in a clickable div
  if (children) {
    return (
      <div onClick={openMaps} className={cn('cursor-pointer', className)}>
        {children}
      </div>
    );
  }

  // Default two-button layout
  return (
    <div className={cn('flex gap-2', className)}>
      <Button
        variant="default"
        size="lg"
        className="flex-1"
        onClick={openMaps}
      >
        <Navigation className="w-5 h-5 mr-2" />
        Navigate
      </Button>
      <Button
        variant="outline"
        size="lg"
        onClick={openWaze}
        className="px-4"
      >
        <Map className="w-5 h-5" />
      </Button>
    </div>
  );
}
