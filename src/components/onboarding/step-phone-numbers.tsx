'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Phone, Smartphone, ArrowRight, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPhoneDisplay, normalizePhone } from '@/lib/carrier-detection';

interface StepPhoneNumbersProps {
  initialData: {
    businessPhone?: string;
    cellPhone?: string;
  };
  onNext: (data: { businessPhone: string; cellPhone: string }) => void;
  onBack?: () => void;
}

export function StepPhoneNumbers({ initialData, onNext, onBack }: StepPhoneNumbersProps) {
  const [businessPhone, setBusinessPhone] = useState(initialData.businessPhone || '');
  const [cellPhone, setCellPhone] = useState(initialData.cellPhone || '');
  const [errors, setErrors] = useState<{ business?: string; cell?: string }>({});

  const validatePhone = (phone: string): boolean => {
    const digits = phone.replace(/\D/g, '');
    return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: { business?: string; cell?: string } = {};

    if (!businessPhone) {
      newErrors.business = 'Business phone is required';
    } else if (!validatePhone(businessPhone)) {
      newErrors.business = 'Please enter a valid 10-digit phone number';
    }

    if (!cellPhone) {
      newErrors.cell = 'Cell phone is required for SMS alerts';
    } else if (!validatePhone(cellPhone)) {
      newErrors.cell = 'Please enter a valid 10-digit phone number';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onNext({
      businessPhone: normalizePhone(businessPhone),
      cellPhone: normalizePhone(cellPhone),
    });
  };

  const formatInput = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Phone className="w-8 h-8 text-primary-600" />
        </div>
        <h2 className="text-2xl font-bold text-navy-800">Phone Numbers</h2>
        <p className="text-gray-600 mt-2">
          We need two numbers to set up CallSeal
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Business Phone */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Phone className="w-4 h-4" />
            Business Phone Number
          </label>
          <p className="text-xs text-gray-500">
            The number your customers call. We&apos;ll forward missed calls from here.
          </p>
          <input
            type="tel"
            value={businessPhone}
            onChange={(e) => {
              setBusinessPhone(formatInput(e.target.value));
              setErrors((prev) => ({ ...prev, business: undefined }));
            }}
            placeholder="(512) 555-1234"
            className={cn(
              'w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition text-lg',
              errors.business ? 'border-red-300 bg-red-50' : 'border-gray-300'
            )}
          />
          {errors.business && (
            <p className="text-sm text-red-600">{errors.business}</p>
          )}
        </div>

        {/* Cell Phone */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Smartphone className="w-4 h-4" />
            Your Cell Phone
          </label>
          <p className="text-xs text-gray-500">
            Where we&apos;ll send SMS alerts for new leads and urgent callbacks.
          </p>
          <input
            type="tel"
            value={cellPhone}
            onChange={(e) => {
              setCellPhone(formatInput(e.target.value));
              setErrors((prev) => ({ ...prev, cell: undefined }));
            }}
            placeholder="(512) 555-5678"
            className={cn(
              'w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition text-lg',
              errors.cell ? 'border-red-300 bg-red-50' : 'border-gray-300'
            )}
          />
          {errors.cell && (
            <p className="text-sm text-red-600">{errors.cell}</p>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">What happens next?</p>
              <p className="mt-1">
                We&apos;ll set up call forwarding so when you miss a call, it goes to our AI receptionist.
                You&apos;ll get an SMS alert with the lead details.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          {onBack && (
            <Button type="button" variant="ghost" onClick={onBack} className="flex-1">
              Back
            </Button>
          )}
          <Button type="submit" className="flex-1">
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </form>
    </div>
  );
}
