'use client';

import { useEffect, useState } from 'react';
import { useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  Calendar,
  DollarSign,
  FileText,
  Briefcase,
  Users,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TranscriptViewer } from '@/components/ui/transcript-viewer';
import { formatDateTime, formatRelativeTime } from '@/lib/format';
import { formatPhone, phoneHref } from '@/lib/utils';
import type { Call } from '@/types/database';

/** Format call duration for display */
function formatDuration(seconds: number | null): string {
  if (!seconds) return 'Unknown';
  if (seconds < 60) return `${seconds} seconds`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) {
    return secs > 0 ? `${mins}m ${secs}s` : `${mins} minutes`;
  }
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours}h ${remMins}m`;
}

/** Get outcome display info */
function getOutcomeDisplay(outcome: string | null): { label: string; color: string; description: string } {
  const outcomes: Record<string, { label: string; color: string; description: string }> = {
    completed: { label: 'Booked', color: 'bg-green-100 text-green-700', description: 'Customer booked an appointment' },
    callback_later: { label: 'Callback Requested', color: 'bg-blue-100 text-blue-700', description: 'Customer requested a callback' },
    sales_lead: { label: 'Sales Lead', color: 'bg-purple-100 text-purple-700', description: 'Potential sales opportunity' },
    customer_hangup: { label: 'Customer Hung Up', color: 'bg-red-100 text-red-700', description: 'Call ended unexpectedly' },
    wrong_number: { label: 'Wrong Number', color: 'bg-gray-100 text-gray-600', description: 'Caller had wrong number' },
    out_of_area: { label: 'Out of Area', color: 'bg-amber-100 text-amber-700', description: 'Customer outside service area' },
    safety_emergency: { label: 'Safety Emergency', color: 'bg-red-100 text-red-700', description: 'Tier 1 emergency - advised to call 911' },
    urgent_escalation: { label: 'Urgent Escalation', color: 'bg-orange-100 text-orange-700', description: 'Tier 2 urgent - owner alerted' },
    waitlist_added: { label: 'Added to Waitlist', color: 'bg-purple-100 text-purple-600', description: 'Customer added to waitlist' },
    cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-600', description: 'Appointment was cancelled' },
    rescheduled: { label: 'Rescheduled', color: 'bg-blue-100 text-blue-700', description: 'Appointment was rescheduled' },
  };
  return outcomes[outcome || ''] || { label: outcome || 'Unknown', color: 'bg-gray-100 text-gray-600', description: 'Unknown outcome' };
}

/** Get revenue tier color */
function getTierColor(label: string | null): string {
  if (!label) return 'bg-gray-100 text-gray-600';
  const dollarCount = (label.match(/\$/g) || []).length;
  if (dollarCount >= 4) return 'bg-red-100 text-red-700';
  if (dollarCount === 3) return 'bg-orange-100 text-orange-700';
  if (dollarCount === 2) return 'bg-blue-100 text-blue-700';
  if (dollarCount === 1) return 'bg-green-100 text-green-700';
  return 'bg-gray-100 text-gray-600';
}

export default function CallDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [call, setCall] = useState<Call | null>(null);
  const [timezone, setTimezone] = useState('America/New_York');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCall() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/calls/${id}`);
        const data = await response.json();

        if (!response.ok) {
          if (response.status === 404) {
            setError('not_found');
          } else {
            setError(data.error || 'Failed to fetch call');
          }
          return;
        }

        setCall(data.call);
        setTimezone(data.timezone || 'America/New_York');
      } catch (err) {
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchCall();
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

  if (error === 'not_found' || !call) {
    notFound();
  }

  if (error) {
    return (
      <div className="p-4 space-y-4">
        <Link
          href="/calls"
          className="inline-flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5 mr-1" />
          Back to Calls
        </Link>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  const outcomeDisplay = getOutcomeDisplay(call.outcome);
  const DirectionIcon = call.direction === 'inbound' ? PhoneIncoming : PhoneOutgoing;

  return (
    <div className="p-4 space-y-4">
      {/* Back Button */}
      <Link
        href="/calls"
        className="inline-flex items-center text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-5 h-5 mr-1" />
        Back to Calls
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <DirectionIcon className={`w-5 h-5 ${call.direction === 'inbound' ? 'text-green-600' : 'text-blue-600'}`} />
          <span className="text-sm text-gray-500 capitalize">{call.direction} call</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          {call.customer_name || formatPhone(call.phone_number)}
        </h1>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${outcomeDisplay.color}`}>
            {outcomeDisplay.label}
          </span>
          {call.urgency_tier && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
              {call.urgency_tier}
            </span>
          )}
        </div>
      </div>

      {/* Caller Info */}
      <Card>
        <CardHeader>
          <CardTitle>Caller</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <a
            href={phoneHref(call.phone_number)}
            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
          >
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <Phone className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{formatPhone(call.phone_number)}</p>
              <p className="text-sm text-gray-500">Tap to call</p>
            </div>
          </a>

          {call.customer_name && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{call.customer_name}</p>
                <p className="text-sm text-gray-500">Customer name</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Call Details */}
      <Card>
        <CardHeader>
          <CardTitle>Call Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-gray-400" />
            <div>
              <p className="font-medium text-gray-900">
                {formatDateTime(call.started_at, timezone)}
              </p>
              <p className="text-sm text-gray-500">{formatRelativeTime(call.started_at)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-gray-400" />
            <div>
              <p className="font-medium text-gray-900">{formatDuration(call.duration_seconds)}</p>
              <p className="text-sm text-gray-500">Call duration</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-gray-400" />
            <div>
              <p className="font-medium text-gray-900">{outcomeDisplay.label}</p>
              <p className="text-sm text-gray-500">{outcomeDisplay.description}</p>
            </div>
          </div>

          {/* Revenue Tier */}
          {call.revenue_tier_label && (
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-gray-400" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-0.5 text-sm font-semibold rounded ${getTierColor(call.revenue_tier_label)}`}>
                    {call.revenue_tier_label}
                  </span>
                  <span className="font-medium text-gray-900">Revenue Estimate</span>
                </div>
                {call.revenue_tier_signals && call.revenue_tier_signals.length > 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    Signals: {call.revenue_tier_signals.join(', ')}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* HVAC Issue Type */}
          {call.hvac_issue_type && (
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900">{call.hvac_issue_type}</p>
                <p className="text-sm text-gray-500">Issue type</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Problem Description */}
      {call.problem_description && (
        <Card>
          <CardHeader>
            <CardTitle>Problem Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">{call.problem_description}</p>
          </CardContent>
        </Card>
      )}

      {/* Transcript */}
      <TranscriptViewer
        transcript={call.transcript_object}
        maxCollapsedMessages={6}
      />

      {/* Related Job/Lead */}
      {(call.job_id || call.lead_id) && (
        <Card>
          <CardHeader>
            <CardTitle>Related Records</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {call.job_id && (
              <Link
                href={`/jobs/${call.job_id}`}
                className="flex items-center gap-3 p-3 bg-green-50 rounded-lg hover:bg-green-100 transition"
              >
                <Briefcase className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-700">View Job</p>
                  <p className="text-sm text-green-600">This call resulted in a booked job</p>
                </div>
              </Link>
            )}
            {call.lead_id && (
              <Link
                href={`/leads/${call.lead_id}`}
                className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
              >
                <Users className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-700">View Lead</p>
                  <p className="text-sm text-blue-600">This call created a lead</p>
                </div>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* Call IDs (for debugging/reference) */}
      <Card>
        <CardHeader>
          <CardTitle>Reference IDs</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Call ID</dt>
              <dd className="font-mono text-gray-700">{call.call_id}</dd>
            </div>
            {call.retell_call_id && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Retell ID</dt>
                <dd className="font-mono text-gray-700">{call.retell_call_id}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
