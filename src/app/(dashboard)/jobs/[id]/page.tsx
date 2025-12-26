'use client';

import { useEffect, useState } from 'react';
import { useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, ChevronDown, Edit, AlertTriangle, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { extractUrgencySignals } from '@/lib/extract-signals';
import { DiagnosticContextInline } from '@/components/ui/diagnostic-context';
import { JobStatusButtons } from '@/components/jobs/job-status-buttons';
import { RescheduleModal } from '@/components/jobs/reschedule-modal';
import { CancelModal } from '@/components/jobs/cancel-modal';
import { EditJobModal } from '@/components/jobs/edit-job-modal';
import { SmsHistory } from '@/components/ui/sms-history';
import { OperatorNotes } from '@/components/ui/operator-notes';
import { CallHistoryList } from '@/components/calls/call-history-list';
import { CustomerIntelligenceCard } from '@/components/customers/customer-intelligence-card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/format';
import type { Job } from '@/types/database';

// New Hero-First components
import { DetailHero } from '@/components/leads/detail-hero';
import { QuickActions } from '@/components/leads/quick-actions';
import { AppointmentCard } from '@/components/leads/appointment-card';
import { SmartSummary } from '@/components/leads/smart-summary';
import { JobActionFooter, StickyFooterSpacer } from '@/components/leads/sticky-action-footer';

export default function JobDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [timezone, setTimezone] = useState('America/New_York');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  // Check if job can be edited (only 'new' status)
  const canEdit = job?.status === 'new';

  // Check if job can be rescheduled
  const canReschedule = job?.scheduled_at &&
    job.status !== 'complete' &&
    job.status !== 'cancelled' &&
    job.status !== 'en_route' &&
    job.status !== 'on_site';

  // Check if job can be cancelled (same conditions as reschedule)
  const canCancel = job?.scheduled_at &&
    job.status !== 'complete' &&
    job.status !== 'cancelled' &&
    job.status !== 'en_route' &&
    job.status !== 'on_site';

  const handleRescheduled = (updatedJob: Job) => {
    setJob(updatedJob);
    setShowRescheduleModal(false);
  };

  const handleEdited = (updatedJob: Job) => {
    setJob(updatedJob);
    setShowEditModal(false);
  };

  const handleCancelled = (updatedJob: Job) => {
    setJob(updatedJob);
    setShowCancelModal(false);
  };

  useEffect(() => {
    async function fetchJob() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/jobs/${id}`);
        const data = await response.json();

        if (!response.ok) {
          if (response.status === 404) {
            setError('not_found');
          } else {
            setError(data.error || 'Failed to fetch job');
          }
          return;
        }

        setJob(data.job);
        setTimezone(data.timezone || 'America/New_York');
      } catch (err) {
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchJob();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="animate-pulse">
          <div className="h-6 w-24 bg-gray-200 rounded mb-4" />
          <div className="h-8 w-48 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-32 bg-gray-200 rounded mb-6" />
          <div className="h-32 bg-gray-200 rounded mb-4" />
          <div className="h-48 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (error === 'not_found' || !job) {
    notFound();
  }

  if (error) {
    return (
      <div className="p-4 space-y-4">
        <Link
          href="/jobs"
          className="inline-flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5 mr-1" />
          Back to Jobs
        </Link>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  // Extract urgency signals
  const urgencySignals = extractUrgencySignals(job.ai_summary);

  // Check if we have diagnostic context
  const hasDiagnostics = job.problem_duration || job.problem_onset ||
    job.problem_pattern || job.customer_attempted_fixes;

  return (
    <div className="p-4 space-y-4">
      {/* Back Button + Edit */}
      <div className="flex items-center justify-between">
        <Link
          href="/booked"
          className="inline-flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5 mr-1" />
          Back to Booked
        </Link>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)}>
            <Edit className="w-4 h-4 mr-1" />
            Edit
          </Button>
        )}
      </div>

      {/* ===== HERO SECTION ===== */}
      <DetailHero
        customerName={job.customer_name}
        urgency={job.urgency}
        revenueTier={job.revenue_tier_label}
        revenueConfidence={job.revenue_confidence}
        serviceType={job.service_type}
        createdAt={job.created_at}
      />

      {/* ===== APPOINTMENT CARD ===== */}
      <AppointmentCard
        scheduledAt={job.scheduled_at}
        timezone={timezone}
        onReschedule={() => setShowRescheduleModal(true)}
        canReschedule={!!canReschedule}
        isAiBooked={job.is_ai_booked}
      />

      {/* ===== QUICK ACTIONS ===== */}
      <QuickActions
        phone={job.customer_phone}
        address={job.customer_address}
      />

      {/* ===== STATUS BUTTONS ===== */}
      <JobStatusButtons
        jobId={job.id}
        currentStatus={job.status}
        needsAction={job.needs_action}
      />

      {/* ===== SMART SUMMARY ===== */}
      <SmartSummary
        aiSummary={job.ai_summary}
      />

      {/* ===== NEEDS ACTION ALERT ===== */}
      {job.needs_action_note && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">Action Required</p>
              <p className="text-sm text-red-700 mt-1">{job.needs_action_note}</p>
            </div>
          </div>
        </div>
      )}

      {/* ===== CUSTOMER INTELLIGENCE ===== */}
      <CustomerIntelligenceCard phone={job.customer_phone} />

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
              {/* Status */}
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={job.status} />
                {job.is_ai_booked && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    AI Booked
                  </span>
                )}
              </div>

              {/* Diagnostic Context */}
              {hasDiagnostics && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <DiagnosticContextInline
                    problemDuration={job.problem_duration}
                    problemOnset={job.problem_onset}
                    problemPattern={job.problem_pattern}
                    customerAttemptedFixes={job.customer_attempted_fixes}
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

              {/* Revenue Signals */}
              {job.revenue_tier_signals && job.revenue_tier_signals.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Revenue Signals</p>
                  <p className="text-sm text-gray-600">
                    {job.revenue_tier_signals.join(', ')}
                  </p>
                </div>
              )}

              {/* Created Date */}
              <div className="text-sm text-gray-500">
                Job created {formatDateTime(job.created_at, timezone)}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* ===== SMS ACTIVITY ===== */}
      <SmsHistory jobId={job.id} />

      {/* ===== OPERATOR NOTES ===== */}
      <OperatorNotes
        customerPhone={job.customer_phone}
        customerName={job.customer_name}
        jobId={job.id}
      />

      {/* ===== CALL HISTORY ===== */}
      <CallHistoryList phone={job.customer_phone} />

      {/* ===== CALL TRANSCRIPT (Collapsed) ===== */}
      {job.call_transcript && (
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
                    {job.call_transcript}
                  </pre>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* Spacer for sticky footer */}
      <StickyFooterSpacer />

      {/* ===== STICKY ACTION FOOTER ===== */}
      <JobActionFooter
        phone={job.customer_phone}
        jobId={job.id}
        currentStatus={job.status}
        onReschedule={() => setShowRescheduleModal(true)}
        onCancel={() => setShowCancelModal(true)}
        canReschedule={!!canReschedule}
        canCancel={!!canCancel}
      />

      {/* Reschedule Modal */}
      {showRescheduleModal && job && (
        <RescheduleModal
          job={job}
          timezone={timezone}
          onClose={() => setShowRescheduleModal(false)}
          onRescheduled={handleRescheduled}
        />
      )}

      {/* Edit Job Modal */}
      {showEditModal && job && (
        <EditJobModal
          job={job}
          onClose={() => setShowEditModal(false)}
          onSaved={handleEdited}
        />
      )}

      {/* Cancel Modal */}
      {showCancelModal && job && (
        <CancelModal
          job={job}
          timezone={timezone}
          onClose={() => setShowCancelModal(false)}
          onCancelled={handleCancelled}
        />
      )}
    </div>
  );
}
