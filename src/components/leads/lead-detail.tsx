'use client';

import { useState } from 'react';
import { Lead } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  LeadStatusBadge,
  LeadPriorityBadge,
  RevenueTierBadge,
  ServiceTypeBadge,
  UrgencyBadge,
  getRevenueTierInfo,
} from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Phone,
  MessageSquare,
  Navigation,
  Sparkles,
  FileText,
  ChevronDown,
  Calendar,
  Clock,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeadDetailProps {
  lead: Lead;
  onBookJob: () => void;
  onSnooze: () => void;
  onMarkLost: (reason?: string) => void;
}

/** Get street address (first part before comma) */
function getStreetAddress(address: string | null): string {
  if (!address) return 'Address pending';
  const parts = address.split(',');
  return parts[0].trim();
}

/** Format service type for display */
function formatServiceType(type: string | null): string {
  if (!type) return 'Service Request';
  const labels: Record<string, string> = {
    hvac: 'HVAC',
    plumbing: 'Plumbing',
    electrical: 'Electrical',
    general: 'General',
  };
  return labels[type] || type.charAt(0).toUpperCase() + type.slice(1);
}

export function LeadDetail({ lead, onBookJob, onSnooze, onMarkLost }: LeadDetailProps) {
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [showLostConfirm, setShowLostConfirm] = useState(false);

  // Get revenue tier info (derive from estimated_value or use a default)
  const revenueTier = deriveRevenueTier(lead.estimated_value);
  const tierInfo = getRevenueTierInfo(revenueTier);

  // Determine issue description (prefer ai_summary, fallback to issue_description)
  const issueDescription = lead.ai_summary || lead.issue_description || null;

  return (
    <div className="space-y-4">
      {/* Badges Header */}
      <div className="flex flex-wrap gap-2">
        <LeadPriorityBadge priority={lead.priority} />
        <LeadStatusBadge status={lead.status} />
        <RevenueTierBadge tier={revenueTier} />
      </div>

      {/* Contact Section */}
      <Card>
        <CardContent className="p-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">
            {lead.customer_name}
          </h2>
          {lead.customer_address && (
            <p className="text-gray-600 mb-4">{lead.customer_address}</p>
          )}
          {!lead.customer_address && (
            <p className="text-gray-400 italic mb-4">Address pending</p>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <a href={`tel:${lead.customer_phone}`} className="contents">
              <Button variant="outline" className="h-14 flex-col gap-1">
                <Phone className="w-5 h-5" />
                <span className="text-xs">Call</span>
              </Button>
            </a>
            <a href={`sms:${lead.customer_phone}`} className="contents">
              <Button variant="outline" className="h-14 flex-col gap-1">
                <MessageSquare className="w-5 h-5" />
                <span className="text-xs">Text</span>
              </Button>
            </a>
            {lead.customer_address ? (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.customer_address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="contents"
              >
                <Button variant="outline" className="h-14 flex-col gap-1">
                  <Navigation className="w-5 h-5" />
                  <span className="text-xs">Navigate</span>
                </Button>
              </a>
            ) : (
              <Button variant="outline" className="h-14 flex-col gap-1" disabled>
                <Navigation className="w-5 h-5 text-gray-300" />
                <span className="text-xs text-gray-400">Navigate</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Issue Details */}
      <Card>
        <CardContent className="p-4">
          {/* Service Type & Urgency */}
          <div className="flex items-center gap-2 mb-3">
            <ServiceTypeBadge type={lead.service_type} />
            <UrgencyBadge urgency={lead.urgency} />
          </div>

          {/* Revenue Tier Card */}
          <div className={cn(
            "rounded-lg p-3 mb-3",
            tierInfo.className.replace('text-', 'bg-').split(' ')[0].replace('bg-', 'bg-') + '/20'
          )} style={{ backgroundColor: getBackgroundColor(revenueTier) }}>
            <div className="flex items-center gap-2">
              <RevenueTierBadge tier={revenueTier} />
              <span className="text-sm font-medium text-gray-900">{tierInfo.label}</span>
            </div>
            <p className="text-xs text-gray-600 mt-1">Est. {tierInfo.range}</p>
          </div>

          {/* Issue Description */}
          {issueDescription && (
            <div className="text-sm text-gray-700">
              <span className="font-medium text-gray-900">Issue: </span>
              {issueDescription}
            </div>
          )}

          {/* Distance */}
          {lead.distance_miles && (
            <p className="text-xs text-gray-500 mt-2">
              {lead.distance_miles.toFixed(1)} miles away
            </p>
          )}
        </CardContent>
      </Card>

      {/* AI Summary Section */}
      {lead.ai_summary && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              AI Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700">{lead.ai_summary}</p>
            {lead.why_not_booked && (
              <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Why not booked</p>
                    <p className="text-sm text-amber-700 mt-0.5">{lead.why_not_booked}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Call Transcript (Collapsible) */}
      {lead.call_transcript && (
        <Card>
          <Collapsible open={transcriptOpen} onOpenChange={setTranscriptOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-2 cursor-pointer hover:bg-gray-50 transition-colors">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Call Transcript
                  </span>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 transition-transform duration-200",
                      transcriptOpen && "rotate-180"
                    )}
                  />
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="bg-gray-50 rounded-lg p-3 max-h-64 overflow-y-auto">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                    {lead.call_transcript}
                  </pre>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* Lost Confirmation Dialog */}
      {showLostConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-2">Mark as Lost?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to mark this lead as lost? This action cannot be undone.
            </p>
            <div className="space-y-2">
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => {
                  onMarkLost();
                  setShowLostConfirm(false);
                }}
              >
                Yes, Mark as Lost
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setShowLostConfirm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Action Footer - Sticky on mobile */}
      <div className="fixed bottom-0 left-0 right-0 lg:relative lg:mt-4 bg-white border-t lg:border-0 p-4 space-y-2 z-40">
        <Button className="w-full" size="lg" onClick={onBookJob}>
          <Calendar className="w-4 h-4 mr-2" />
          Book Job
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={onSnooze}>
            <Clock className="w-4 h-4 mr-2" />
            Snooze
          </Button>
          <Button
            variant="outline"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => setShowLostConfirm(true)}
          >
            <XCircle className="w-4 h-4 mr-2" />
            Mark Lost
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Derive revenue tier from estimated value
 * Based on CallLock pricing tiers:
 * - $$$$ ($5k-$15k+): Replacement
 * - $$$ ($800-$3k): Major Repair
 * - $$ ($200-$800): Standard Repair
 * - $ ($75-$250): Maintenance
 * - $$? ($99): Diagnostic/Unknown
 */
function deriveRevenueTier(estimatedValue: number | null): string {
  if (!estimatedValue) return '$$?';
  if (estimatedValue >= 5000) return '$$$$';
  if (estimatedValue >= 800) return '$$$';
  if (estimatedValue >= 200) return '$$';
  if (estimatedValue >= 75) return '$';
  return '$$?';
}

/**
 * Get background color for revenue tier card
 */
function getBackgroundColor(tier: string): string {
  switch (tier) {
    case '$$$$': return 'rgba(254, 226, 226, 0.5)'; // red-100/50
    case '$$$': return 'rgba(255, 237, 213, 0.5)';  // orange-100/50
    case '$$': return 'rgba(219, 234, 254, 0.5)';   // blue-100/50
    case '$': return 'rgba(220, 252, 231, 0.5)';    // green-100/50
    default: return 'rgba(243, 244, 246, 0.5)';     // gray-100/50
  }
}
