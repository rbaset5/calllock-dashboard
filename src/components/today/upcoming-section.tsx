'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, Calendar } from 'lucide-react';
import * as Collapsible from '@radix-ui/react-collapsible';
import { UpcomingJob, UpcomingResponse } from '@/app/api/upcoming/route';
import { UpcomingAppointmentItem } from './upcoming-appointment-item';
import { cn } from '@/lib/utils';

export function UpcomingSection() {
  const [appointments, setAppointments] = useState<UpcomingJob[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    async function fetchUpcoming() {
      try {
        const response = await fetch('/api/upcoming');
        if (response.ok) {
          const data: UpcomingResponse = await response.json();
          setAppointments(data.appointments);
          setTotal(data.total);
        }
      } catch (error) {
        console.error('Error fetching upcoming appointments:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchUpcoming();
  }, []);

  if (loading) {
    return (
      <div className="mt-6">
        <div className="animate-pulse">
          <div className="h-6 bg-navy-100 rounded w-32 mb-4" />
          <div className="h-24 bg-navy-100 rounded mb-3" />
          <div className="h-24 bg-navy-100 rounded" />
        </div>
      </div>
    );
  }

  if (total === 0) {
    return null; // Don't show section if no upcoming appointments
  }

  return (
    <Collapsible.Root open={isOpen} onOpenChange={setIsOpen} className="mt-6">
      {/* Section Header */}
      <Collapsible.Trigger asChild>
        <button className="flex items-center justify-between w-full py-2 group">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-navy-400" />
            <span className="text-sm font-semibold text-navy-600">
              Upcoming ({total})
            </span>
          </div>
          <ChevronDown
            className={cn(
              'w-5 h-5 text-navy-400 transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
          />
        </button>
      </Collapsible.Trigger>

      {/* Appointments List */}
      <Collapsible.Content className="mt-3">
        <div className="pl-1">
          {appointments.map((appointment, index) => (
            <UpcomingAppointmentItem
              key={appointment.id}
              appointment={appointment}
              isFirst={index === 0}
              isLast={index === appointments.length - 1}
            />
          ))}
        </div>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
