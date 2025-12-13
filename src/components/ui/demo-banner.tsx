'use client';

import { useState } from 'react';
import { X, FlaskConical } from 'lucide-react';

export function DemoBanner() {
  const [dismissed, setDismissed] = useState(false);

  // Only show if NEXT_PUBLIC_DEMO_MODE is true
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true' || dismissed) {
    return null;
  }

  return (
    <div className="bg-amber-500 text-amber-950">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4" />
          <span className="text-sm font-medium">
            Demo Mode - Using sample data
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 hover:bg-amber-600 rounded transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
