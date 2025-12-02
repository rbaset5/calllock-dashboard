import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Phone, MapPin, Clock, Calendar, DollarSign, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge, UrgencyBadge, ServiceTypeBadge } from '@/components/ui/badge';
import { JobStatusButtons } from '@/components/jobs/job-status-buttons';
import { MapLink } from '@/components/jobs/map-link';
import { formatDateTime, formatScheduleTime, formatCurrency } from '@/lib/format';
import { formatPhone, phoneHref, formatServiceType } from '@/lib/utils';

interface JobDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Get user timezone
  const { data: profile } = await supabase
    .from('users')
    .select('timezone')
    .eq('id', user.id)
    .single();

  const timezone = profile?.timezone || 'America/New_York';

  // Get job
  const { data: job } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!job) {
    notFound();
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
        <CardHeader>
          <CardTitle>Details</CardTitle>
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
    </div>
  );
}
