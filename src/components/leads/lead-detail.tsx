'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Lead } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Badge,
  LeadStatusBadge,
  RevenueTierBadge,
  ConfidenceIndicator,
  getRevenueTierInfo,
} from '@/components/ui/badge';
import { extractUrgencySignals } from '@/lib/extract-signals';
import { EndCallReasonBadge, getEndCallReasonInfo } from '@/components/ui/end-call-reason-badge';
import { DiagnosticContext, DiagnosticContextInline } from '@/components/ui/diagnostic-context';
import { OperatorNotes } from '@/components/ui/operator-notes';
import { CallHistoryList } from '@/components/calls/call-history-list';
import { CustomerIntelligenceCard } from '@/components/customers/customer-intelligence-card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Phone,
  FileText,
  ChevronDown,
  AlertTriangle,
  Wrench,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { isCriticalSignal } from '@/lib/revenue-signals';
import { CriticalSignalBadge, SignalBadge } from '@/components/ui/critical-signal-badge';

// New Hero-First components
import { DetailHero } from './detail-hero';
import { QuickActions } from './quick-actions';
import { SmartSummary } from './smart-summary';
import { StickyActionFooter, StickyFooterSpacer } from './sticky-action-footer';

interface LeadDetailProps {
  lead: Lead;
  onBookJob: () => void;
  onSnooze: () => void;
  onMarkLost: (reason?: string) => void;
  onCallTap?: () => void;
}

export function LeadDetail({ lead, onBookJob, onSnooze, onMarkLost, onCallTap }: LeadDetailProps) {
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [showLostConfirm, setShowLostConfirm] = useState(false);

  // Use stored revenue tier if available, otherwise derive from estimated_value
  const revenueTier = lead.revenue_tier_label || deriveRevenueTier(lead.estimated_value);
  const tierInfo = getRevenueTierInfo(revenueTier);
  const tierSignals = lead.revenue_tier_signals || [];

  // Extract urgency signals
  const urgencySignals = extractUrgencySignals(lead.issue_description);

  // Check if we have diagnostic context
  const hasDiagnostics = lead.problem_duration || lead.problem_onset ||
    lead.problem_pattern || lead.customer_attempted_fixes;

  return (
    <div className="space-y-4">
      {/* ===== HERO SECTION ===== */}
      <DetailHero
        customerName={lead.customer_name}
        urgency={lead.urgency}
        priorityColor={lead.priority_color}
        equipmentType={lead.equipment_type}
        equipmentAge={lead.equipment_age}
        revenueTier={revenueTier}
        revenueConfidence={lead.revenue_confidence}
        serviceType={lead.service_type}
        createdAt={lead.created_at}
        // HVAC Must-Have Fields
        propertyType={lead.property_type}
        systemStatus={lead.system_status}
        equipmentAgeBracket={lead.equipment_age_bracket}
        isDecisionMaker={lead.is_decision_maker}
        decisionMakerContact={lead.decision_maker_contact}
      />

      {/* ===== QUICK ACTIONS ===== */}
      <QuickActions
        phone={lead.customer_phone}
        address={lead.customer_address}
        onCallClick={onCallTap}
      />

      {/* ===== SMART SUMMARY ===== */}
      <SmartSummary
        aiSummary={lead.ai_summary}
        issueDescription={lead.issue_description}
        whyNotBooked={lead.why_not_booked}
      />

      {/* ===== CUSTOMER INTELLIGENCE ===== */}
      {/* Only shows for repeat customers with history */}
      <CustomerIntelligenceCard phone={lead.customer_phone} />

      {/* ===== DETAILS (Expandable) ===== */}
      <Card>
        <Collapsible defaultOpen={Boolean(hasDiagnostics) || urgencySignals.length > 0}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Additional Details
                </span>
                <ChevronDown className="w-4 h-4 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              {/* Status + Call Outcome */}
              <div className="flex flex-wrap gap-2">
                <LeadStatusBadge status={lead.status} />
                <EndCallReasonBadge reason={lead.end_call_reason} status={lead.status} />
              </div>

              {/* Diagnostic Context */}
              {hasDiagnostics && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <DiagnosticContextInline
                    problemDuration={lead.problem_duration}
                    problemOnset={lead.problem_onset}
                    problemPattern={lead.problem_pattern}
                    customerAttemptedFixes={lead.customer_attempted_fixes}
                  />
                </div>
              )}

              {/* Urgency Signals */}
              {urgencySignals.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Urgency Signals
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {urgencySignals.map((signal) => (
                      <Badge key={signal} variant="warning" className="text-xs">
                        {signal}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Revenue Tier Signals */}
              {tierSignals.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Revenue Signals</p>
                  <div className="flex flex-wrap gap-1">
                    {tierSignals.map((signal, i) =>
                      isCriticalSignal(signal) ? (
                        <CriticalSignalBadge key={i} signal={signal} />
                      ) : (
                        <SignalBadge key={i} signal={signal} />
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Equipment Info (if not shown in hero) */}
              {(lead.equipment_type || lead.equipment_age) && !lead.equipment_type && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Wrench className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      {lead.equipment_type && (
                        <p className="text-sm text-gray-900">
                          <span className="font-medium">Equipment:</span> {lead.equipment_type}
                        </p>
                      )}
                      {lead.equipment_age && (
                        <p className="text-sm text-gray-900">
                          <span className="font-medium">Age:</span> {lead.equipment_age}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Sales Notes */}
              {lead.sales_lead_notes && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Sales Notes</p>
                  <p className="text-sm text-gray-600">{lead.sales_lead_notes}</p>
                </div>
              )}

              {/* Distance */}
              {lead.distance_miles && (
                <p className="text-sm text-gray-500">
                  {lead.distance_miles.toFixed(1)} miles away
                </p>
              )}

              {/* Original Call Link */}
              {lead.original_call_id && (
                <Link
                  href={`/calls/${lead.original_call_id}`}
                  className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <Phone className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-gray-600 flex-1">
                    From voice call on {new Date(lead.created_at).toLocaleDateString()}
                  </span>
                  <span className="text-xs text-blue-600">View Call →</span>
                </Link>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* ===== OPERATOR NOTES ===== */}
      {/* Only renders if there are human-added notes */}
      <OperatorNotes
        customerPhone={lead.customer_phone}
        customerName={lead.customer_name}
        leadId={lead.id}
      />

      {/* ===== CALL HISTORY ===== */}
      <CallHistoryList phone={lead.customer_phone} />

      {/* ===== CALL TRANSCRIPT (Collapsed by default) ===== */}
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

      {/* Spacer for sticky footer */}
      <StickyFooterSpacer />

      {/* ===== STICKY ACTION FOOTER ===== */}
      <StickyActionFooter
        phone={lead.customer_phone}
        onCall={onCallTap}
        onBook={onBookJob}
        onSnooze={onSnooze}
        onMarkLost={() => setShowLostConfirm(true)}
      />
    </div>
  );
}

/**
 * Derive revenue tier from estimated value
 */
function deriveRevenueTier(estimatedValue: number | null): string {
  if (!estimatedValue) return '$$?';
  if (estimatedValue >= 5000) return '$$$$';
  if (estimatedValue >= 800) return '$$$';
  if (estimatedValue >= 200) return '$$';
  if (estimatedValue >= 75) return '$';
  return '$$?';
}

export default LeadDetail;
