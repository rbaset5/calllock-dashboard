'use client';

import { ActionItem } from '@/app/api/today/route';
import { ActionItemCard } from './action-item-card';
import { Zap, ChevronRight, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';

interface ActionItemsSectionProps {
  items: ActionItem[];
  totalCount?: number;
}

export function ActionItemsSection({ items, totalCount }: ActionItemsSectionProps) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const displayCount = totalCount || items.length;

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -350, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 350, behavior: 'smooth' });
    }
  };

  // Show all items in carousel
  const displayItems = items.slice(0, 10);

  if (items.length === 0) {
    return null;
  }

  const handleBookJob = (item: ActionItem) => {
    if (item.leadId) {
      router.push(`/action-items?lead=${item.leadId}&action=book`);
    }
  };

  const handleViewQuote = (item: ActionItem) => {
    if (item.leadId) {
      router.push(`/action-items?lead=${item.leadId}`);
    }
  };

  const handleViewHistory = (item: ActionItem) => {
    if (item.customerId) {
      router.push(`/customers/${item.customerId}`);
    } else if (item.leadId) {
      router.push(`/action-items?lead=${item.leadId}`);
    }
  };

  const handleMarkComplete = async (item: ActionItem) => {
    if (item.leadId) {
      try {
        await fetch(`/api/leads/${item.leadId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'converted' }),
        });
        router.refresh();
      } catch (error) {
        console.error('Error marking complete:', error);
      }
    }
  };

  const handleSnooze = (item: ActionItem) => {
    if (item.leadId) {
      router.push(`/action-items?lead=${item.leadId}&action=snooze`);
    } else if (item.jobId) {
      router.push(`/action-items?job=${item.jobId}&action=snooze`);
    }
  };

  return (
    <div className="space-y-3">
      {/* Header with View All Link */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Zap className="w-4 h-4 text-amber-500" />
          <span>ACTION ITEMS</span>
        </div>
        <Link
          href="/action-items"
          className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-0.5"
        >
          View all {displayCount}
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Horizontal Scroll Cards with Navigation */}
      <div className="flex items-center gap-2">
        {/* Left Arrow */}
        <button
          onClick={scrollLeft}
          className="flex-shrink-0 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div
          ref={scrollRef}
          className="flex-1 overflow-x-auto scrollbar-hide"
          style={{
            WebkitOverflowScrolling: 'touch',
            scrollSnapType: 'x mandatory',
          }}
        >
        <div className="flex items-stretch gap-3" style={{ width: 'max-content' }}>
          {displayItems.map((item) => (
            <div
              key={item.id}
              className="w-[340px] flex-shrink-0 flex"
              style={{ scrollSnapAlign: 'start' }}
            >
              <ActionItemCard
                item={item}
                onBookJob={handleBookJob}
                onViewQuote={handleViewQuote}
                onViewHistory={handleViewHistory}
                onMarkComplete={handleMarkComplete}
                onSnooze={handleSnooze}
              />
            </div>
          ))}
        </div>
        </div>

        {/* Right Arrow */}
        <button
          onClick={scrollRight}
          className="flex-shrink-0 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

    </div>
  );
}
