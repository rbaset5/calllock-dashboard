'use client';

import { useState, useEffect, useCallback } from 'react';
import { Job } from '@/types/database';
import { BookedResponse } from '@/app/api/booked/route';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RevenueTierBadge } from '@/components/ui/revenue-tier-badge';
import { PageTabs } from '@/components/ui/page-tabs';
import { QuickScanBar } from '@/components/ui/quick-scan-bar';
import {
  RefreshCw,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Navigation,
  Sparkles,
  Info,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';

/** Format time for display */
function formatJobTime(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'h:mm a');
  } catch {
    return '';
  }
}

/** Get short address */
function getShortAddress(address: string | null): string {
  if (!address) return 'Address pending';
  const parts = address.split(',');
  return parts[0].trim();
}

/** Extract problem type from AI summary */
function extractProblem(summary: string | null): string {
  if (!summary) return 'Service call';
  const firstSentence = summary.split(/[.!?]/)[0].trim();
  const cleaned = firstSentence
    .replace(/^(the customer (called|reported|mentioned|said) (about |that )?)/i, '')
    .replace(/^(their |the )/i, '');
  const capitalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return capitalized.length > 40 ? capitalized.slice(0, 40) + '...' : capitalized;
}

/** Job Card Component - PRD V4 simplified with inline expansion */
function JobCard({
  job,
  onNavigate,
  onCall,
}: {
  job: Job;
  onNavigate: (address: string) => void;
  onCall: (phone: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const jobTime = job.scheduled_at ? formatJobTime(job.scheduled_at) : '';

  return (
    <Card
      className={cn(
        'overflow-hidden cursor-pointer hover:shadow-md transition-shadow',
        job.is_ai_booked ? 'border-l-4 border-l-gold-500' : 'border-l-4 border-l-navy-400'
      )}
      onClick={() => setExpanded(!expanded)}
    >
      <CardContent className="p-4">
        {/* Time */}
        <div className="text-lg font-bold text-navy-800 mb-1">{jobTime}</div>

        {/* Customer Name */}
        <h3 className="font-semibold text-gray-900 mb-1">{job.customer_name}</h3>

        {/* Address */}
        <div className="text-sm text-gray-600 mb-1">
          {getShortAddress(job.customer_address)}
        </div>

        {/* Problem description */}
        <p className="text-sm text-gray-500 mb-2">
          {extractProblem(job.ai_summary)}
        </p>

        {/* Quick scan bar - HVAC must-have fields */}
        <QuickScanBar
          propertyType={job.property_type}
          systemStatus={job.system_status}
          equipmentAgeBracket={job.equipment_age_bracket}
          isDecisionMaker={job.is_decision_maker}
          decisionMakerContact={job.decision_maker_contact}
          className="mb-2"
        />

        {/* Booked by badge */}
        <div className="flex justify-end">
          {job.is_ai_booked ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gold-100 text-gold-700">
              <Sparkles className="w-3 h-3" />
              Booked by AI
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-navy-100 text-navy-700">
              Booked by you
            </span>
          )}
        </div>

        {/* Expanded content */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
            {/* Full address with maps link */}
            {job.customer_address && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate(job.customer_address);
                }}
                className="flex items-start gap-2 w-full text-left p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="text-gray-700">{job.customer_address}</span>
                  <span className="text-blue-600 text-xs ml-2">Open in Maps</span>
                </div>
              </button>
            )}

            {/* Phone with call link */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCall(job.customer_phone);
              }}
              className="flex items-center gap-2 w-full text-left p-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-gray-700">{job.customer_phone}</span>
              <span className="text-blue-600 text-xs ml-2">Call Customer</span>
            </button>

            {/* Revenue tier */}
            {job.revenue_tier_label && (
              <div className="px-2">
                <RevenueTierBadge
                  tier={job.revenue_tier}
                  label={job.revenue_tier_label}
                  signals={job.revenue_tier_signals}
                  showTooltip
                />
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate(job.customer_address);
                }}
              >
                <Navigation className="w-4 h-4 mr-1" />
                Navigate
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onCall(job.customer_phone);
                }}
              >
                <Phone className="w-4 h-4 mr-1" />
                Call
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Empty state for no bookings */
function BookedEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-navy-100 flex items-center justify-center mb-4">
        <Calendar className="w-8 h-8 text-navy-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">No upcoming appointments</h3>
      <p className="text-sm text-gray-500 max-w-xs">
        Booked jobs will appear here. AI-booked appointments show a gold badge.
      </p>
    </div>
  );
}

export default function BookedPage() {
  const [data, setData] = useState<BookedResponse | null>(null);
  const [actionCount, setActionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);

      // Fetch both booked data and action count in parallel
      const [bookedResponse, actionResponse] = await Promise.all([
        fetch('/api/booked'),
        fetch('/api/action'),
      ]);

      if (!bookedResponse.ok) {
        throw new Error('Failed to fetch booked items');
      }

      const result: BookedResponse = await bookedResponse.json();
      setData(result);

      // Get action count for tabs
      if (actionResponse.ok) {
        const actionData = await actionResponse.json();
        setActionCount(actionData.counts?.total || 0);
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching booked items:', err);
      setError('Unable to load schedule');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Refresh every 60 seconds
    const interval = setInterval(() => fetchData(), 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Handle navigation
  const handleNavigate = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://maps.google.com/maps?daddr=${encodedAddress}`, '_blank');
  };

  // Handle call
  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const counts = data?.counts || {
    total: 0,
    today: 0,
    tomorrow: 0,
    thisWeek: 0,
    later: 0,
    aiBooked: 0,
    manualBooked: 0,
  };

  if (loading) {
    return (
      <div className="cl-page-container">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-navy-100 rounded w-32" />
          <div className="h-24 bg-navy-100 rounded" />
          <div className="h-6 bg-navy-100 rounded w-24" />
          <div className="h-32 bg-navy-100 rounded" />
          <div className="h-32 bg-navy-100 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cl-page-container">
        <div className="text-center py-12">
          <p className="text-error-600 mb-4">{error}</p>
          <Button onClick={() => fetchData()}>Try Again</Button>
        </div>
      </div>
    );
  }

  const groups = data?.groups || [];

  // Log deprecation warning
  if (typeof window !== 'undefined') {
    console.warn('[Velocity] Deprecated page accessed: /booked - Use /inbox instead');
  }

  return (
    <div className="cl-page-container">
      {/* Deprecation Banner */}
      <Link
        href="/inbox?filter=booked"
        className="flex items-center gap-3 p-3 mb-4 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
      >
        <Info className="w-5 h-5 text-amber-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-800">
            This view has moved to Inbox
          </p>
          <p className="text-xs text-amber-600">
            Click here to view booked items in the new Inbox
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-amber-400" />
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-navy-800">Booked</h1>
          <span className="text-lg text-navy-400">({counts.total})</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            aria-label="Refresh"
          >
            <RefreshCw className={cn('w-5 h-5', refreshing && 'animate-spin')} />
          </Button>
          <Link href="/history">
            <Button variant="ghost" size="icon" aria-label="History">
              <Clock className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* In-page tab bar - ACTION/BOOKED */}
      <PageTabs
        activeTab="booked"
        actionCount={actionCount}
        bookedCount={counts.total}
      />

      {/* Summary Stats */}
      <div className="max-w-lg mx-auto mb-6">
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-navy-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-navy-800">{counts.today}</div>
            <div className="text-xs text-navy-500">Today</div>
          </div>
          <div className="bg-navy-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-navy-800">{counts.tomorrow}</div>
            <div className="text-xs text-navy-500">Tomorrow</div>
          </div>
          <div className="bg-navy-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-navy-800">{counts.thisWeek}</div>
            <div className="text-xs text-navy-500">This Week</div>
          </div>
          <div className="bg-gold-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-gold-700">{counts.aiBooked}</div>
            <div className="text-xs text-gold-600">AI Booked</div>
          </div>
        </div>
      </div>

      {/* Job Groups by Day */}
      {groups.length === 0 ? (
        <BookedEmptyState />
      ) : (
        <div className="max-w-lg mx-auto space-y-6">
          {groups.map((group) => (
            <div key={group.date}>
              {/* Day Header */}
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-lg font-semibold text-navy-800">{group.label}</h2>
                <span className="text-sm text-navy-400">
                  ({group.jobs.length} job{group.jobs.length !== 1 ? 's' : ''})
                </span>
              </div>

              {/* Jobs for this day */}
              <div className="space-y-3">
                {group.jobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onNavigate={handleNavigate}
                    onCall={handleCall}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
