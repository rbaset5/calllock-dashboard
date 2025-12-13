'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lead } from '@/types/database';
import { LeadDetail, BookJobModal, RemindMeModal } from '@/components/leads';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw } from 'lucide-react';

interface LeadDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function LeadDetailPage({ params }: LeadDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Modal states
  const [showBookModal, setShowBookModal] = useState(false);
  const [showRemindModal, setShowRemindModal] = useState(false);

  // Determine return path from query params (default to action-items)
  const returnPath = searchParams.get('from') || '/action-items';

  const fetchLead = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);

      const response = await fetch(`/api/leads/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError('Lead not found');
        } else {
          throw new Error('Failed to fetch lead');
        }
        return;
      }
      const result: Lead = await response.json();
      setLead(result);
      setError(null);
    } catch (err) {
      console.error('Error fetching lead:', err);
      setError('Unable to load lead details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchLead();
  }, [fetchLead]);

  // Handler functions
  const handleBookJob = () => setShowBookModal(true);
  const handleSnooze = () => setShowRemindModal(true);

  const handleMarkLost = async (reason?: string) => {
    try {
      await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'lost', lost_reason: reason }),
      });
      router.push(returnPath);
    } catch (error) {
      console.error('Error marking lead as lost:', error);
    }
  };

  const handleJobBooked = (jobId: string) => {
    setShowBookModal(false);
    router.push(`/jobs/${jobId}`);
  };

  const handleSetReminder = async (lead: Lead, remindAt: string) => {
    try {
      await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remind_at: remindAt }),
      });
      setShowRemindModal(false);
      fetchLead(); // Refresh to show new status
    } catch (error) {
      console.error('Error setting reminder:', error);
    }
  };

  const handleBack = () => {
    router.push(returnPath);
  };

  // Loading state
  if (loading) {
    return (
      <div className="p-4 lg:p-6 max-w-2xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-24" />
          <div className="flex gap-2">
            <div className="h-6 bg-gray-200 rounded w-16" />
            <div className="h-6 bg-gray-200 rounded w-24" />
            <div className="h-6 bg-gray-200 rounded w-12" />
          </div>
          <div className="h-48 bg-gray-200 rounded" />
          <div className="h-32 bg-gray-200 rounded" />
          <div className="h-24 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4 lg:p-6 max-w-2xl mx-auto">
        <Button variant="ghost" onClick={handleBack} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => fetchLead()}>Try Again</Button>
        </div>
      </div>
    );
  }

  if (!lead) return null;

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto pb-40 lg:pb-6">
      {/* Header with Back Button and Refresh */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" onClick={handleBack} className="-ml-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchLead(true)}
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <LeadDetail
        lead={lead}
        onBookJob={handleBookJob}
        onSnooze={handleSnooze}
        onMarkLost={handleMarkLost}
      />

      {/* Book Job Modal */}
      {showBookModal && (
        <BookJobModal
          lead={lead}
          onClose={() => setShowBookModal(false)}
          onBooked={handleJobBooked}
        />
      )}

      {/* Remind Me Modal */}
      {showRemindModal && (
        <RemindMeModal
          lead={lead}
          onClose={() => setShowRemindModal(false)}
          onSetReminder={handleSetReminder}
        />
      )}
    </div>
  );
}
