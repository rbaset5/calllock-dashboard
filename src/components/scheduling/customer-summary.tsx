'use client';

import { User, Phone, MapPin, DollarSign, Calendar } from 'lucide-react';

interface CustomerSummaryProps {
  /** Customer name */
  name: string;
  /** Customer phone */
  phone: string;
  /** Customer address (optional) */
  address?: string | null;
  /** Issue description (optional) */
  issueDescription?: string | null;
  /** Estimated value (optional) */
  estimatedValue?: number | null;
  /** Current appointment (optional, for reschedule view) */
  currentAppointment?: string | null;
}

export function CustomerSummary({
  name,
  phone,
  address,
  issueDescription,
  estimatedValue,
  currentAppointment,
}: CustomerSummaryProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm">
        <User className="w-4 h-4 text-gray-400" />
        <span className="font-medium">{name}</span>
      </div>
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Phone className="w-4 h-4 text-gray-400" />
        <span>{phone}</span>
      </div>
      {address && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin className="w-4 h-4 text-gray-400" />
          <span className="truncate">{address}</span>
        </div>
      )}
      {issueDescription && (
        <p className="text-sm text-gray-600 mt-2 line-clamp-2">
          {issueDescription}
        </p>
      )}
      {estimatedValue && estimatedValue > 0 && (
        <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
          <DollarSign className="w-4 h-4" />
          <span>Est. ${estimatedValue.toLocaleString()}</span>
        </div>
      )}
      {currentAppointment && (
        <div className="flex items-center gap-2 text-sm text-gray-600 pt-1 border-t mt-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span>
            Currently scheduled: <span className="font-medium">{currentAppointment}</span>
          </span>
        </div>
      )}
    </div>
  );
}
