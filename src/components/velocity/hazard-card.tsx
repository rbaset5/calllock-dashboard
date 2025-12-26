'use client';

/**
 * HazardCard Component
 *
 * For HAZARD archetype (safety emergencies)
 * Red color scheme with AlertTriangle icon
 */

import { useState } from 'react';
import {
  MapPin,
  Phone,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react';
import { ProfileAvatar } from '@/components/ui/profile-avatar';
import { cn } from '@/lib/utils';
import { buildInlineNarrative, getExpandedLabel } from '@/lib/narrative-engine';
import { buildSmartTags, getTagClasses } from '@/lib/smart-tags';
import { CommandGrid } from './command-grid';
import FloatingCard from '../ui/floating-card';
import type { VelocityCardProps } from './types';

export function HazardCard({
  data,
  onCall,
  className,
}: VelocityCardProps) {
  const [expanded, setExpanded] = useState(false);

  const customerPhone = data.customer_phone || '';
  const address = data.customer_address || '';

  // Build inline narrative with semantic parts
  const narrative = buildInlineNarrative(data, 'HAZARD');

  // Build smart tags
  const tags = buildSmartTags(data, 'HAZARD');

  // Get expanded section label
  const expandedLabel = getExpandedLabel('HAZARD');

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCall) {
      onCall(customerPhone);
    } else {
      window.location.href = `tel:${customerPhone}`;
    }
  };

  return (
    <FloatingCard
      className={cn(
        className,
        'border-red-500 shadow-red-500/20'
      )}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex gap-3 items-start flex-1 overflow-hidden">
          {/* Icon */}
          <div className="relative flex-shrink-0">
            <ProfileAvatar
              name={data.customer_name || 'Customer'}
              style="organic"
              size={44}
              className="border-[1.5px] border-white dark:border-gray-600 shadow-sm ring-1 ring-black/5"
            />
            <div className="absolute -bottom-0.5 -right-0.5 bg-red-500 rounded-full p-0.5 border-[3px] border-white dark:border-gray-600 w-5.5 h-5.5 flex items-center justify-center shadow-sm">
              <Phone className="text-white w-2.5 h-2.5" fill="currentColor" strokeWidth={2} />
            </div>
          </div>

          {/* Contextual Typography Narrative */}
          <div className="flex-1 pt-[2px] overflow-hidden">
            <p className="text-sm leading-snug">
              {narrative.segments.map((segment, i) => (
                <span
                  key={i}
                  className={segment.emphasis === 'bold'
                    ? 'font-medium text-gray-900 dark:text-white'
                    : 'text-gray-500 dark:text-gray-400'}
                >
                  {i > 0 && ' '}
                  {segment.text}
                </span>
              ))}
            </p>
            {narrative.subtext && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {narrative.subtext}
              </p>
            )}
          </div>
        </div>

        {/* Archetype Badge */}
        <span className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 flex-shrink-0 ml-4">
          HAZARD
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {/* Smart Tags */}
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag, idx) => (
            <span
              key={idx}
              className={cn(
                'px-3.5 py-1.5 rounded-full text-[11px] font-semibold tracking-wide',
                getTagClasses(tag.variant)
              )}
            >
              {tag.label}
            </span>
          ))}
        </div>

        {/* Expandable Section */}
        <div className={cn(
          "transition-all duration-300 w-full",
          expanded ? "bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4" : ""
        )}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className={cn(
              "w-full rounded-full py-3 px-5 flex justify-between items-center group transition-all duration-300",
              expanded
                ? "mb-4 bg-white dark:bg-gray-700 shadow-sm"
                : "bg-[#F0F2F5] dark:bg-gray-800/50 hover:bg-gray-200 dark:hover:bg-gray-700"
            )}
          >
            <div className="flex items-center text-[#65676B] dark:text-gray-400 text-[14px] font-semibold">
              <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mr-3">
                <AlertTriangle className="text-red-600 dark:text-red-400 w-3.5 h-3.5" strokeWidth={2} />
              </div>
              {expandedLabel}
            </div>
            {expanded ? (
              <ChevronUp className="text-gray-400 w-5 h-5" strokeWidth={2} />
            ) : (
              <ChevronDown className="text-gray-400 w-5 h-5 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" strokeWidth={2} />
            )}
          </button>

          {expanded && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-300">
              {/* Command Grid */}
              <CommandGrid data={data} archetype="HAZARD" />

              {/* Call Button */}
              <button
                onClick={handleCall}
                className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white rounded-xl px-4 py-3 flex items-center justify-center space-x-2 shadow-sm transition-colors font-semibold"
              >
                <Phone className="w-4 h-4" fill="currentColor" strokeWidth={2} />
                <span>Call Now</span>
              </button>

              {/* Address */}
              {address && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(
                      `https://maps.google.com/maps?q=${encodeURIComponent(address)}`,
                      '_blank',
                      'noopener noreferrer'
                    );
                  }}
                  className="mt-3 w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-red-600 transition-colors"
                >
                  <MapPin className="w-4 h-4" />
                  <span className="underline">{address}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </FloatingCard>
  );
}

export default HazardCard;
