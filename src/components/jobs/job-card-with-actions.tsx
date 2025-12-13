'use client';

import { useRouter } from 'next/navigation';
import { Phone, Navigation, Eye, Play, Truck, Wrench, CheckCircle, X } from 'lucide-react';
import { JobCard } from '@/components/jobs/job-card';
import { MapLink } from '@/components/jobs/map-link';
import {
  DropDrawer,
  DropDrawerTrigger,
  DropDrawerContent,
  DropDrawerItem,
  DropDrawerSeparator,
  DropDrawerLabel,
} from '@/components/ui/dropdrawer';
import { getMapUrl } from '@/lib/utils';
import type { Job } from '@/types/database';

interface JobCardWithActionsProps {
  job: Job;
  timezone: string;
  onStatusChange?: (jobId: string, newStatus: string) => void;
  onComplete?: (jobId: string) => void;
}

export function JobCardWithActions({
  job,
  timezone,
  onStatusChange,
  onComplete,
}: JobCardWithActionsProps) {
  const router = useRouter();

  const handleCall = () => {
    window.location.href = `tel:${job.customer_phone}`;
  };

  const handleNavigate = () => {
    window.open(getMapUrl(job.customer_address), '_blank');
  };

  const handleViewDetails = () => {
    router.push(`/jobs/${job.id}`);
  };

  const handleStartTravel = () => {
    onStatusChange?.(job.id, 'en_route');
  };

  const handleStartJob = () => {
    onStatusChange?.(job.id, 'on_site');
  };

  const handleCompleteJob = () => {
    if (onComplete) {
      onComplete(job.id);
    } else {
      router.push(`/jobs/${job.id}?complete=true`);
    }
  };

  // Determine which status actions to show based on current status
  const showStartTravel = job.status === 'new' || job.status === 'confirmed';
  const showStartJob = job.status === 'en_route';
  const showCompleteJob = job.status === 'on_site';

  return (
    <DropDrawer>
      <DropDrawerTrigger asChild>
        <div>
          <JobCard job={job} timezone={timezone} />
        </div>
      </DropDrawerTrigger>
      <DropDrawerContent title={job.customer_name} description={job.ai_summary || 'Job actions'}>
        <DropDrawerLabel>Quick Actions</DropDrawerLabel>

        <DropDrawerItem onClick={handleCall}>
          <Phone className="w-4 h-4" />
          <span>Call Customer</span>
        </DropDrawerItem>

        <DropDrawerItem onClick={handleNavigate}>
          <Navigation className="w-4 h-4" />
          <span>Navigate to Location</span>
        </DropDrawerItem>

        <DropDrawerSeparator />

        <DropDrawerItem onClick={handleViewDetails}>
          <Eye className="w-4 h-4" />
          <span>View Details</span>
        </DropDrawerItem>

        {showStartTravel && (
          <DropDrawerItem onClick={handleStartTravel}>
            <Truck className="w-4 h-4" />
            <span>Start Travel</span>
          </DropDrawerItem>
        )}

        {showStartJob && (
          <DropDrawerItem onClick={handleStartJob}>
            <Wrench className="w-4 h-4" />
            <span>Start Job</span>
          </DropDrawerItem>
        )}

        {showCompleteJob && (
          <DropDrawerItem onClick={handleCompleteJob}>
            <CheckCircle className="w-4 h-4" />
            <span>Complete Job</span>
          </DropDrawerItem>
        )}
      </DropDrawerContent>
    </DropDrawer>
  );
}
