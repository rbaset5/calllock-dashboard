'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SmartSummaryProps {
  aiSummary?: string | null;
  issueDescription?: string | null;
  whyNotBooked?: string | null;
  defaultExpanded?: boolean;
  maxLines?: number;
  className?: string;
}

/**
 * Smart summary component with deduplication
 * Shows AI summary (preferred) or issue description
 * Includes "why not booked" warning if present
 */
export function SmartSummary({
  aiSummary,
  issueDescription,
  whyNotBooked,
  defaultExpanded = false,
  maxLines = 3,
  className,
}: SmartSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Deduplicate content - prefer AI summary
  const displayContent = useMemo(() => {
    if (aiSummary && aiSummary.trim()) {
      return aiSummary.trim();
    }
    if (issueDescription && issueDescription.trim()) {
      return issueDescription.trim();
    }
    return null;
  }, [aiSummary, issueDescription]);

  // Check if content needs expansion (more than maxLines worth)
  const needsExpansion = useMemo(() => {
    if (!displayContent) return false;
    // Rough estimate: ~80 chars per line on mobile
    const estimatedLines = Math.ceil(displayContent.length / 80);
    return estimatedLines > maxLines;
  }, [displayContent, maxLines]);

  if (!displayContent && !whyNotBooked) {
    return null;
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Why Not Booked Warning */}
      {whyNotBooked && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Why not booked</p>
            <p className="text-sm text-amber-700 mt-0.5">{whyNotBooked}</p>
          </div>
        </div>
      )}

      {/* Main Summary Content */}
      {displayContent && (
        <div className="bg-gray-50 rounded-lg border border-gray-100">
          {/* Header */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
            <FileText className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Summary</span>
          </div>

          {/* Content */}
          <div className="px-3 py-3">
            <div
              className={cn(
                'text-sm text-gray-700 leading-relaxed whitespace-pre-wrap',
                !isExpanded && needsExpansion && 'line-clamp-3'
              )}
            >
              {displayContent}
            </div>

            {/* Expand/Collapse Button */}
            {needsExpansion && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1 mt-2 text-sm font-medium text-navy-600 hover:text-navy-700"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Show more
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact inline summary for list views
 */
export function SmartSummaryCompact({
  aiSummary,
  issueDescription,
  maxLength = 120,
  className,
}: {
  aiSummary?: string | null;
  issueDescription?: string | null;
  maxLength?: number;
  className?: string;
}) {
  const displayContent = useMemo(() => {
    const content = aiSummary?.trim() || issueDescription?.trim();
    if (!content) return null;

    // Get first sentence or truncate
    const firstSentence = content.split(/[.!?]/)[0];
    if (firstSentence.length <= maxLength) {
      return firstSentence + (content.length > firstSentence.length ? '...' : '');
    }
    return content.substring(0, maxLength).trim() + '...';
  }, [aiSummary, issueDescription, maxLength]);

  if (!displayContent) return null;

  return (
    <p className={cn('text-sm text-gray-600 line-clamp-2', className)}>
      {displayContent}
    </p>
  );
}

export default SmartSummary;
