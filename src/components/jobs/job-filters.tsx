'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

const statusFilters = [
  { value: '', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'en_route', label: 'En Route' },
  { value: 'on_site', label: 'On Site' },
  { value: 'complete', label: 'Complete' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function JobFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentStatus = searchParams.get('status') || '';
  const needsAction = searchParams.get('needs_action') === 'true';

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // Reset needs_action when changing status
    if (key === 'status') {
      params.delete('needs_action');
    }
    router.push(`/jobs?${params.toString()}`);
  }

  function toggleNeedsAction() {
    const params = new URLSearchParams(searchParams.toString());
    if (needsAction) {
      params.delete('needs_action');
    } else {
      params.set('needs_action', 'true');
      params.delete('status');
    }
    router.push(`/jobs?${params.toString()}`);
  }

  return (
    <div className="space-y-3">
      {/* Needs Action Toggle */}
      <button
        onClick={toggleNeedsAction}
        className={cn(
          'w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium transition-colors',
          needsAction
            ? 'bg-red-100 text-red-700 border-2 border-red-300'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        )}
      >
        <span className={cn(
          'w-2 h-2 rounded-full',
          needsAction ? 'bg-red-500 animate-pulse' : 'bg-gray-400'
        )} />
        Needs Action
      </button>

      {/* Status Pills */}
      <div className="flex flex-wrap gap-2">
        {statusFilters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => updateFilter('status', filter.value)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              currentStatus === filter.value && !needsAction
                ? 'bg-primary-100 text-primary-700 border-2 border-primary-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>
    </div>
  );
}
