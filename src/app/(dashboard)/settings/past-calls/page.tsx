'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Lead } from '@/types/database';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';

interface ArchivedLead extends Lead {
  archived_reason?: string;
}

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy');
  } catch {
    return '';
  }
}

function getStatusLabel(lead: ArchivedLead): { text: string; color: string } {
  if (lead.status === 'converted') {
    return { text: 'Booked', color: 'text-emerald-600' };
  }
  if (lead.status === 'lost') {
    return { text: lead.lost_reason || 'Lost', color: 'text-slate-500' };
  }
  return { text: 'Resolved', color: 'text-blue-600' };
}

export default function PastCallsPage() {
  const [leads, setLeads] = useState<ArchivedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/history?limit=100');
      if (!response.ok) throw new Error('Failed to fetch');

      const data = await response.json();
      setLeads(data.leads || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredLeads = leads.filter((lead) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      lead.customer_name.toLowerCase().includes(query) ||
      lead.customer_phone.includes(query) ||
      lead.ai_summary?.toLowerCase().includes(query)
    );
  });

  const groupedByDate = filteredLeads.reduce(
    (acc, lead) => {
      const date = formatDate(lead.created_at);
      if (!acc[date]) acc[date] = [];
      acc[date].push(lead);
      return acc;
    },
    {} as Record<string, ArchivedLead[]>
  );

  return (
    <main className="flex flex-col max-w-lg mx-auto w-full px-4 pt-4 gap-4 pb-8">
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          className="p-2 -ml-2 text-slate-400 hover:text-slate-600 rounded-lg"
        >
          <span className="material-symbols-outlined text-[24px]">arrow_back</span>
        </Link>
        <h1 className="text-xl font-bold text-slate-900">Past Calls</h1>
      </div>

      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
          search
        </span>
        <Input
          type="text"
          placeholder="Search past calls..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded w-24" />
          <div className="h-16 bg-slate-200 rounded" />
          <div className="h-16 bg-slate-200 rounded" />
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="text-center py-12">
          <span className="material-symbols-outlined text-slate-300 text-5xl mb-4">
            history
          </span>
          <p className="text-slate-500">
            {searchQuery ? 'No matching calls found' : 'No past calls yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByDate).map(([date, dateLeads]) => (
            <div key={date}>
              <h2 className="text-sm font-semibold text-slate-400 mb-2">{date}</h2>
              <div className="space-y-2">
                {dateLeads.map((lead) => {
                  const status = getStatusLabel(lead);
                  return (
                    <div
                      key={lead.id}
                      className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-100"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 truncate">
                          {lead.customer_name}
                        </p>
                        <p className="text-sm text-slate-400 truncate">
                          {lead.ai_summary?.split('.')[0] || 'Service call'}
                        </p>
                      </div>
                      <span className={`text-sm font-medium ${status.color}`}>
                        {status.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
