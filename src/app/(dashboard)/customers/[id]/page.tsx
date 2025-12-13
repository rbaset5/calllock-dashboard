'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CustomerDetailResponse } from '@/app/api/customers/[id]/route';
import { CustomerDetail, CustomerNotes, EditCustomerModal } from '@/components/customers';
import { UpcomingAppointmentCard } from '@/components/customers/upcoming-appointment-card';
import { InteractionTimeline } from '@/components/customers/interaction-timeline';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import type { Customer } from '@/types/database';

interface CustomerDetailPageProps {
  params: { id: string };
}

export default function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const { id } = params;
  const router = useRouter();
  const [data, setData] = useState<CustomerDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timezone, setTimezone] = useState('America/New_York');
  const [showEditModal, setShowEditModal] = useState(false);

  const fetchCustomer = useCallback(async () => {
    try {
      const response = await fetch(`/api/customers/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError('Customer not found');
        } else {
          throw new Error('Failed to fetch customer');
        }
        return;
      }

      const result: CustomerDetailResponse = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching customer:', err);
      setError('Unable to load customer details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCustomer();

    // Get timezone from localStorage
    const tokenData = localStorage.getItem('supabase.auth.token');
    if (tokenData) {
      try {
        const parsed = JSON.parse(tokenData);
        const tz = parsed.user?.user_metadata?.timezone || 'America/New_York';
        setTimezone(tz);
      } catch (e) {
        console.error('Error parsing token data:', e);
      }
    }
  }, [fetchCustomer]);

  if (loading) {
    return (
      <div className="p-4 lg:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-32" />
          <div className="h-48 bg-gray-200 rounded" />
          <div className="h-24 bg-gray-200 rounded" />
          <div className="h-48 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 lg:p-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => fetchCustomer()}>Try Again</Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-4 lg:p-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      {/* Upcoming Appointment (if any) */}
      {data.upcomingJobs && data.upcomingJobs.length > 0 && (
        <div className="mb-4">
          <UpcomingAppointmentCard job={data.upcomingJobs[0]} timezone={timezone} />
        </div>
      )}

      {/* Customer Updates (AI reads these to customer) */}
      <CustomerNotes phone={data.customer.phone} />

      <CustomerDetail
        customer={data.customer}
        serviceHistory={data.serviceHistory}
        timezone={timezone}
        onEdit={() => setShowEditModal(true)}
      />

      {/* Interaction Timeline (jobs + leads + SMS) */}
      <div className="mt-4">
        <InteractionTimeline
          jobs={data.serviceHistory}
          leads={data.leads || []}
          smsLogs={data.recentSms || []}
          timezone={timezone}
        />
      </div>

      {/* Edit Customer Modal */}
      {showEditModal && (
        <EditCustomerModal
          customer={data.customer}
          onClose={() => setShowEditModal(false)}
          onSaved={(updatedCustomer: Customer) => {
            setData({ ...data, customer: updatedCustomer });
            setShowEditModal(false);
          }}
        />
      )}
    </div>
  );
}
