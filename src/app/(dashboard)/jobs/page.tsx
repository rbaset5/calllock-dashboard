import { createClient } from '@/lib/supabase/server';
import { JobCard } from '@/components/jobs/job-card';
import { JobFilters } from '@/components/jobs/job-filters';
import { Briefcase } from 'lucide-react';

interface JobsPageProps {
  searchParams: Promise<{
    status?: string;
    needs_action?: string;
  }>;
}

export default async function JobsPage({ searchParams }: JobsPageProps) {
  const params = await searchParams;
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

  // Build query
  let query = supabase
    .from('jobs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // Apply filters
  if (params.needs_action === 'true') {
    query = query.eq('needs_action', true).not('status', 'in', '("complete","cancelled")');
  } else if (params.status) {
    query = query.eq('status', params.status);
  }

  const { data: jobs } = await query.limit(50);

  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">Jobs</h1>
      </div>

      {/* Filters */}
      <div className="mb-4">
        <JobFilters />
      </div>

      {/* Jobs List */}
      {(jobs?.length ?? 0) === 0 ? (
        <div className="text-center py-12">
          <Briefcase className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No jobs found</p>
          <p className="text-sm text-gray-400 mt-1">
            {params.needs_action === 'true'
              ? 'No jobs need attention right now'
              : params.status
              ? `No jobs with status "${params.status}"`
              : 'Jobs will appear here when booked by CallLock'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs?.map((job) => (
            <JobCard key={job.id} job={job} timezone={timezone} />
          ))}
        </div>
      )}
    </div>
  );
}
