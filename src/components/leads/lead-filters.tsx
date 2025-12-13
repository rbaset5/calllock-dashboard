'use client';

import { LeadStatus } from '@/types/database';
import { cn } from '@/lib/utils';

interface LeadFiltersProps {
  selectedStatus: LeadStatus | null;
  onSelectStatus: (status: LeadStatus | null) => void;
  counts: {
    total: number;
    callback_requested: number;
    thinking: number;
    voicemail_left: number;
    deferred: number;
  };
}

const filters: { label: string; status: LeadStatus | null }[] = [
  { label: 'All', status: null },
  { label: 'Callback', status: 'callback_requested' },
  { label: 'Thinking', status: 'thinking' },
  { label: 'Voicemail', status: 'voicemail_left' },
  { label: 'Deferred', status: 'deferred' },
];

export function LeadFilters({ selectedStatus, onSelectStatus, counts }: LeadFiltersProps) {
  const getCount = (status: LeadStatus | null): number => {
    if (status === null) return counts.total;
    return counts[status as keyof typeof counts] || 0;
  };

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
      {filters.map((filter) => {
        const isSelected = selectedStatus === filter.status;
        const count = getCount(filter.status);

        return (
          <button
            key={filter.label}
            onClick={() => onSelectStatus(filter.status)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
              isSelected
                ? 'bg-primary-100 text-primary-700 border border-primary-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {filter.label}
            {count > 0 && (
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center',
                isSelected ? 'bg-primary-200 text-primary-800' : 'bg-gray-200 text-gray-700'
              )}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
