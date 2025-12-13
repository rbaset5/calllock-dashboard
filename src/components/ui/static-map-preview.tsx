'use client';

import { MapPin } from 'lucide-react';

interface StaticMapPreviewProps {
  address: string;
  width?: number;
  height?: number;
  zoom?: number;
  className?: string;
}

export function StaticMapPreview({
  address,
  width = 400,
  height = 120,
  zoom = 13, // Macro view - shows neighborhood context
  className,
}: StaticMapPreviewProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    // Fallback placeholder if no API key
    return (
      <div className={`bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center ${className}`}>
        <div className="flex flex-col items-center gap-1 text-muted-foreground">
          <MapPin className="w-5 h-5" />
          <span className="text-[10px] font-medium">Map Preview</span>
        </div>
      </div>
    );
  }

  const encodedAddress = encodeURIComponent(address);
  const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${encodedAddress}&zoom=${zoom}&size=${width}x${height}&maptype=roadmap&markers=color:red%7C${encodedAddress}&key=${apiKey}`;

  return (
    <img
      src={mapUrl}
      alt={`Map of ${address}`}
      className={className}
      loading="lazy"
    />
  );
}
