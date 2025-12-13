'use client';

import { Customer, Job, CustomerEquipment } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge, UrgencyBadge } from '@/components/ui/badge';
import { Phone, Mail, MapPin, Navigation, MessageSquare, Wrench, Calendar, DollarSign, Edit } from 'lucide-react';
import { formatDate, formatCurrency, formatRelativeTime } from '@/lib/format';

interface CustomerDetailProps {
  customer: Customer;
  serviceHistory: Job[];
  timezone: string;
  onEdit?: () => void;
}

function EquipmentList({ equipment }: { equipment: CustomerEquipment[] }) {
  if (!equipment || equipment.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic">No equipment on file</p>
    );
  }

  return (
    <div className="space-y-2">
      {equipment.map((item, index) => (
        <div key={index} className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-900">
              {item.brand ? `${item.brand} ` : ''}{item.type}
            </span>
            {item.year && (
              <span className="text-sm text-gray-500">({item.year})</span>
            )}
          </div>
          {(item.model || item.location) && (
            <div className="text-sm text-gray-600 mt-1">
              {item.model && <span>Model: {item.model}</span>}
              {item.model && item.location && <span> &middot; </span>}
              {item.location && <span>Location: {item.location}</span>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ServiceHistoryList({ jobs, timezone }: { jobs: Job[]; timezone: string }) {
  if (jobs.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic">No service history</p>
    );
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <div key={job.id} className="border-l-2 border-gray-200 pl-4 py-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-gray-900">
                {job.ai_summary || 'HVAC Service'}
              </p>
              <p className="text-sm text-gray-500 mt-0.5">
                {job.scheduled_at ? formatDate(job.scheduled_at, timezone) : 'Not scheduled'}
              </p>
            </div>
            {job.revenue && (
              <span className="text-sm font-medium text-green-700">
                {formatCurrency(job.revenue)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <StatusBadge status={job.status} />
            <UrgencyBadge urgency={job.urgency} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CustomerDetail({ customer, serviceHistory, timezone, onEdit }: CustomerDetailProps) {
  return (
    <div className="space-y-4">
      {/* Contact Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">{customer.name}</h2>
            {onEdit && (
              <Button variant="ghost" size="sm" onClick={onEdit}>
                <Edit className="w-4 h-4" />
              </Button>
            )}
          </div>

          {customer.address && (
            <p className="text-gray-600 mb-4">{customer.address}</p>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <a href={`tel:${customer.phone}`} className="contents">
              <Button variant="outline" className="h-14 flex-col gap-1">
                <Phone className="w-5 h-5" />
                <span className="text-xs">Call</span>
              </Button>
            </a>
            <a href={`sms:${customer.phone}`} className="contents">
              <Button variant="outline" className="h-14 flex-col gap-1">
                <MessageSquare className="w-5 h-5" />
                <span className="text-xs">Text</span>
              </Button>
            </a>
            {customer.address && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customer.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="contents"
              >
                <Button variant="outline" className="h-14 flex-col gap-1">
                  <Navigation className="w-5 h-5" />
                  <span className="text-xs">Navigate</span>
                </Button>
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-lg border p-3 text-center">
          <p className="text-2xl font-bold text-gray-900">{customer.total_jobs}</p>
          <p className="text-xs text-gray-500">Jobs</p>
        </div>
        <div className="bg-white rounded-lg border p-3 text-center">
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(customer.lifetime_value)}
          </p>
          <p className="text-xs text-gray-500">Lifetime Value</p>
        </div>
        <div className="bg-white rounded-lg border p-3 text-center">
          <p className="text-lg font-bold text-gray-900">
            {customer.last_service_at
              ? formatRelativeTime(customer.last_service_at)
              : 'Never'}
          </p>
          <p className="text-xs text-gray-500">Last Service</p>
        </div>
      </div>

      {/* Equipment */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            Equipment on File
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EquipmentList equipment={customer.equipment || []} />
        </CardContent>
      </Card>

      {/* Service History */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Service History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ServiceHistoryList jobs={serviceHistory} timezone={timezone} />
        </CardContent>
      </Card>

      {/* Notes */}
      {customer.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{customer.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
