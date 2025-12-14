'use client';

import { useEffect, useState } from 'react';
import { useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Phone, MapPin, Clock, Calendar, DollarSign, FileText, CalendarClock, Edit, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge, UrgencyBadge, ServiceTypeBadge, RevenueTierBadge, ConfidenceIndicator, getRevenueTierInfo } from '@/components/ui/badge';
import { DiagnosticContext } from '@/components/ui/diagnostic-context';
import { JobStatusButtons } from '@/components/jobs/job-status-buttons';
import { MapLink } from '@/components/jobs/map-link';
import { RescheduleModal } from '@/components/jobs/reschedule-modal';
import { CancelModal } from '@/components/jobs/cancel-modal';
import { EditJobModal } from '@/components/jobs/edit-job-modal';
import { SmsHistory } from '@/components/ui/sms-history';
import { OperatorNotes } from '@/components/ui/operator-notes';
import { CallHistoryList } from '@/components/calls/call-history-list';
import { CustomerContext } from '@/components/customers/customer-context';
import { formatDateTime, formatScheduleTime, formatCurrency } from '@/lib/format';
import { formatPhone, phoneHref } from '@/lib/utils';
import type { Job } from '@/types/database';

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

  return (
    <div className="p-4 space-y-4">
      {/* Back Button */}
      <Link
        href="/jobs"
        className="inline-flex items-center text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-5 h-5 mr-1" />
        Back to Jobs
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{job.customer_name}</h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <ServiceTypeBadge type={job.service_type} />
            <UrgencyBadge urgency={job.urgency} />
            <StatusBadge status={job.status} />
            {job.needs_action && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 animate-pulse">
                Needs Action
              </span>
            )}
          </div>
        </div>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)}>
            <Edit className="w-4 h-4 mr-1" />
            Edit
          </Button>
        )}
      </div>

      {/* Navigation */}
      <MapLink address={job.customer_address} />

      {/* Status Buttons */}
      <JobStatusButtons
        jobId={job.id}
        currentStatus={job.status}
        needsAction={job.needs_action}
      />

      {/* Customer Info */}
      <Card>
        <CardHeader>
          <CardTitle>Customer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <a
            href={phoneHref(job.customer_phone)}
            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
          >
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <Phone className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{formatPhone(job.customer_phone)}</p>
              <p className="text-sm text-gray-500">Tap to call</p>
            </div>
          </a>

          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
              <MapPin className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{job.customer_address}</p>
              <p className="text-sm text-gray-500">Service address</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule & Revenue */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Details</CardTitle>
          <div className="flex gap-2">
            {canReschedule && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRescheduleModal(true)}
              >
                <CalendarClock className="w-4 h-4 mr-1" />
                Reschedule
              </Button>
            )}
            {canCancel && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowCancelModal(true)}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Cancel
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {job.scheduled_at && (
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900">
                  {formatScheduleTime(job.scheduled_at, timezone)}
                </p>
                <p className="text-sm text-gray-500">Scheduled appointment</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-gray-400" />
            <div>
              <p className="font-medium text-gray-900">
                {formatDateTime(job.created_at, timezone)}
              </p>
              <p className="text-sm text-gray-500">Job created</p>
            </div>
          </div>

          {job.revenue && (
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-green-500" />
              <div>
                <p className="font-medium text-green-600">{formatCurrency(job.revenue)}</p>
                <p className="text-sm text-gray-500">Revenue</p>
              </div>
            </div>
          )}

          {/* Revenue Tier with Confidence */}
          {job.revenue_tier_label && (
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-gray-400" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <RevenueTierBadge tier={job.revenue_tier_label} />
                  <span className="font-medium text-gray-900">
                    {job.revenue_tier_description || getRevenueTierInfo(job.revenue_tier_label).label}
                  </span>
                  {job.revenue_confidence && (
                    <ConfidenceIndicator confidence={job.revenue_confidence} />
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  Est. {job.revenue_tier_range || getRevenueTierInfo(job.revenue_tier_label).range}
                </p>
                {job.revenue_tier_signals && job.revenue_tier_signals.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    Signals: {job.revenue_tier_signals.join(', ')}
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Summary */}
      {job.ai_summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              AI Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">{job.ai_summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Diagnostic Context */}
      <DiagnosticContext
        problemDuration={job.problem_duration}
        problemOnset={job.problem_onset}
        problemPattern={job.problem_pattern}
        customerAttemptedFixes={job.customer_attempted_fixes}
      />

      {/* Needs Action Note */}
      {job.needs_action_note && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">Action Note</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">{job.needs_action_note}</p>
          </CardContent>
        </Card>
      )}

      {/* SMS Activity */}
      <SmsHistory jobId={job.id} />

      {/* Customer Context */}
      <CustomerContext phone={job.customer_phone} />

      {/* Operator Notes */}
      <OperatorNotes
        customerPhone={job.customer_phone}
        customerName={job.customer_name}
        jobId={job.id}
      />

      {/* Call History */}
      <CallHistoryList phone={job.customer_phone} />

      {/* Call Transcript */}
      {job.call_transcript && (
        <Card>
          <CardHeader>
            <CardTitle>Call Transcript</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap text-sm font-mono bg-gray-50 p-4 rounded-lg">
              {job.call_transcript}
            </p>
          </CardContent>
        </Card>
      )}

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
