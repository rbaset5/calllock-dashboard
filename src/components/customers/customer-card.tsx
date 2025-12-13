'use client';

import { Customer } from '@/types/database';
import { Phone, MapPin } from 'lucide-react';
import { formatRelativeTime, formatCurrency } from '@/lib/format';
import Link from 'next/link';

interface CustomerCardProps {
  customer: Customer;
}

export function CustomerCard({ customer }: CustomerCardProps) {
  const handleQuickCall = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.location.href = `tel:${customer.phone}`;
  };

  return (
    <Link
      href={`/customers/${customer.id}`}
      className="block bg-white border rounded-3xl p-4 shadow-lg hover:shadow-xl transition-shadow"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          {/* Name */}
          <h3 className="font-medium text-gray-900 truncate">{customer.name}</h3>

          {/* Phone */}
          <p className="text-sm text-primary-600 mt-0.5">{customer.phone}</p>

          {/* Address */}
          {customer.address && (
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1 truncate">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              {customer.address.split(',')[0]}
            </p>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            {customer.total_jobs > 0 && (
              <span>{customer.total_jobs} job{customer.total_jobs !== 1 ? 's' : ''}</span>
            )}
            {customer.lifetime_value > 0 && (
              <span className="text-green-600 font-medium">
                {formatCurrency(customer.lifetime_value)} lifetime
              </span>
            )}
            {customer.last_service_at && (
              <span>Last: {formatRelativeTime(customer.last_service_at)}</span>
            )}
          </div>
        </div>

        {/* Quick call button */}
        <button
          onClick={handleQuickCall}
          className="p-2.5 rounded-full bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors flex-shrink-0 ml-3"
          aria-label={`Call ${customer.name}`}
        >
          <Phone className="w-5 h-5" />
        </button>
      </div>
    </Link>
  );
}
