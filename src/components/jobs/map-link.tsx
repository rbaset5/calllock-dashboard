'use client';

import { Navigation, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getMapUrl, getWazeUrl } from '@/lib/utils';

interface MapLinkProps {
  address: string;
}

export function MapLink({ address }: MapLinkProps) {
  function openMaps() {
    window.open(getMapUrl(address), '_blank');
  }

  function openWaze() {
    window.open(getWazeUrl(address), '_blank');
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="primary"
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
