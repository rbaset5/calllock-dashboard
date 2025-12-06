'use client';

import { useEffect, useState } from 'react';

interface UserData {
  email: string;
  business_name: string;
  timezone: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<UserData | null>(null);

  useEffect(() => {
    // Get user from localStorage token
    const tokenData = localStorage.getItem('supabase.auth.token');
    if (tokenData) {
      try {
        const parsed = JSON.parse(tokenData);
        setUser({
          email: parsed.user?.email || '',
          business_name: parsed.user?.user_metadata?.business_name || 'Your Business',
          timezone: parsed.user?.user_metadata?.timezone || 'America/New_York',
        });
      } catch (e) {
        console.error('Error parsing token:', e);
      }
    }
  }, []);

  if (!user) {
    return (
      <div className="p-4 lg:p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded mb-4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {user.business_name}!</h1>
        <p className="text-gray-600">Logged in as {user.email}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-2">Jobs Today</h3>
          <p className="text-3xl font-bold text-primary-600">0</p>
          <p className="text-sm text-gray-500">No jobs scheduled</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-2">This Week</h3>
          <p className="text-3xl font-bold text-green-600">$0</p>
          <p className="text-sm text-gray-500">Revenue</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-2">Needs Action</h3>
          <p className="text-3xl font-bold text-orange-600">0</p>
          <p className="text-sm text-gray-500">Jobs requiring attention</p>
        </div>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-800">
          <strong>Dashboard is working!</strong> The full dashboard features will load once the database connection is configured.
        </p>
      </div>
    </div>
  );
}
