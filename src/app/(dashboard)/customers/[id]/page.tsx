'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { CustomerDetailResponse } from '@/app/api/customers/[id]/route';
import { CustomerDetail, CustomerNotes } from '@/components/customers';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw } from 'lucide-react';

interface CustomerDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<CustomerDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timezone, setTimezone] = useState('America/New_York');

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

      {/* Customer Updates (AI reads these to customer) */}
      <CustomerNotes phone={data.customer.phone} />

      <CustomerDetail
        customer={data.customer}
        serviceHistory={data.serviceHistory}
        timezone={timezone}
      />
    </div>
  );
}
