'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { JobCardWithActions } from '@/components/jobs/job-card-with-actions';
import { JobFilters } from '@/components/jobs/job-filters';
import { CreateJobModal } from '@/components/jobs/create-job-modal';
import { Button } from '@/components/ui/button';
import { Briefcase, Plus } from 'lucide-react';
import type { Job } from '@/types/database';

export default function JobsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [timezone, setTimezone] = useState('America/New_York');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const status = searchParams.get('status');
  const needsAction = searchParams.get('needs_action');

  const handleJobCreated = (job: Job) => {
    setShowCreateModal(false);
    // Navigate to the new job detail page
    router.push(`/jobs/${job.id}`);
  };

  useEffect(() => {
    async function fetchJobs() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (status) params.set('status', status);
        if (needsAction) params.set('needs_action', needsAction);

        const response = await fetch(`/api/jobs?${params.toString()}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Failed to fetch jobs');
          return;
        }

        setJobs(data.jobs || []);
        setTimezone(data.timezone || 'America/New_York');
      } catch (err) {
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchJobs();
  }, [status, needsAction]);

  if (loading) {
    return (
      <div className="p-4 lg:p-6">
        <div className="mb-4 lg:mb-6">
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Jobs</h1>
        </div>
        <div className="mb-4 lg:mb-6">
          <JobFilters />
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded-lg" />
          <div className="h-32 bg-gray-200 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 lg:p-6">
        <div className="mb-4 lg:mb-6">
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Jobs</h1>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-4 lg:mb-6">
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Jobs</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-1" />
          New Job
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-4 lg:mb-6">
        <JobFilters />
      </div>

      {/* Jobs List */}
      {jobs.length === 0 ? (
        <div className="text-center py-12">
          <Briefcase className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No jobs found</p>
          <p className="text-sm text-gray-400 mt-1">
            {needsAction === 'true'
              ? 'No jobs need attention right now'
              : status
              ? `No jobs with status "${status}"`
              : 'Jobs will appear here when booked by CallLock'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4">
          {jobs.map((job) => (
            <JobCardWithActions key={job.id} job={job} timezone={timezone} />
          ))}
        </div>
      )}

      {/* Create Job Modal */}
      {showCreateModal && (
        <CreateJobModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleJobCreated}
        />
      )}
    </div>
  );
}
