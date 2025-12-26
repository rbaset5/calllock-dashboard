'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  X,
  Clock,
  User,
  Phone,
  MapPin,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Wrench,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { DatePicker, TimeSlotGrid, CustomerSummary } from '@/components/scheduling';
import { useCalendarSlotsWithDate } from '@/hooks/use-calendar-slots';
import { formatPhoneInput } from '@/lib/scheduling';
import type { ServiceType, UrgencyLevel, Job } from '@/types/database';

interface CustomerInfo {
  name: string;
  phone: string;
  address: string;
  serviceType: ServiceType;
  urgency: UrgencyLevel;
  notes: string;
}

interface CreateJobModalProps {
  onClose: () => void;
  onCreated: (job: Job) => void;
}

export function CreateJobModal({ onClose, onCreated }: CreateJobModalProps) {
  // Step management
  const [step, setStep] = useState<'info' | 'schedule'>('info');

  // Step 1: Customer info
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    phone: '',
    address: '',
    serviceType: 'hvac',
    urgency: 'medium',
    notes: '',
  });
  const [infoErrors, setInfoErrors] = useState<Partial<Record<keyof CustomerInfo, string>>>({});

  // Step 2: Scheduling
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Use shared hook for slot management
  const { slots, loading: loadingSlots, error: slotsError, selectedSlot, setSelectedSlot, reset: resetSlots } =
    useCalendarSlotsWithDate(step === 'schedule' ? selectedDate : null);

  // General state
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneInput(e.target.value);
    setCustomerInfo({ ...customerInfo, phone: formatted });
  };

  // Validate step 1
  const validateInfo = (): boolean => {
    const errors: Partial<Record<keyof CustomerInfo, string>> = {};

    if (!customerInfo.name.trim() || customerInfo.name.trim().length < 2) {
      errors.name = 'Name is required (min 2 characters)';
    }

    const phoneDigits = customerInfo.phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      errors.phone = 'Valid phone number is required';
    }

    if (!customerInfo.address.trim() || customerInfo.address.trim().length < 5) {
      errors.address = 'Address is required (min 5 characters)';
    }

    setInfoErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateInfo()) {
      setStep('schedule');
      setError(null);
    }
  };

  const handleBack = () => {
    setStep('info');
    setSelectedDate(null);
    resetSlots();
    setError(null);
  };

  const handleCreate = async () => {
    if (!selectedSlot) return;

    setCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerInfo.name.trim(),
          customer_phone: customerInfo.phone.trim(),
          customer_address: customerInfo.address.trim(),
          service_type: customerInfo.serviceType,
          urgency: customerInfo.urgency,
          scheduled_at: selectedSlot.isoDateTime,
          notes: customerInfo.notes.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create job');
      }

      onCreated(data.job);
    } catch (err) {
      console.error('Create job error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create job. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const displayError = error || slotsError;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <Card className="w-full sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col rounded-t-xl sm:rounded-xl animate-in slide-in-from-bottom-4">
        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b shrink-0">
          <CardTitle className="text-lg flex items-center gap-2">
            <Wrench className="w-5 h-5 text-primary-600" />
            {step === 'info' ? 'New Job' : 'New Job - Schedule'}
          </CardTitle>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full"
            disabled={creating}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </CardHeader>

        <CardContent className="space-y-4 pt-4 overflow-y-auto flex-1">
          {step === 'info' ? (
            <>
              {/* Customer Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  Customer Name *
                </Label>
                <Input
                  id="name"
                  placeholder="John Smith"
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                  className={infoErrors.name ? 'border-red-500' : ''}
                />
                {infoErrors.name && (
                  <p className="text-sm text-red-500">{infoErrors.name}</p>
                )}
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  Phone Number *
                </Label>
                <Input
                  id="phone"
                  placeholder="(512) 555-1234"
                  value={customerInfo.phone}
                  onChange={handlePhoneChange}
                  className={infoErrors.phone ? 'border-red-500' : ''}
                />
                {infoErrors.phone && (
                  <p className="text-sm text-red-500">{infoErrors.phone}</p>
                )}
              </div>

              {/* Service Address */}
              <div className="space-y-2">
                <Label htmlFor="address" className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  Service Address *
                </Label>
                <Input
                  id="address"
                  placeholder="1234 Oak St, Austin, TX 78701"
                  value={customerInfo.address}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                  className={infoErrors.address ? 'border-red-500' : ''}
                />
                {infoErrors.address && (
                  <p className="text-sm text-red-500">{infoErrors.address}</p>
                )}
              </div>

              {/* Service Type & Urgency */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Service Type</Label>
                  <Select
                    value={customerInfo.serviceType}
                    onValueChange={(value: ServiceType) =>
                      setCustomerInfo({ ...customerInfo, serviceType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hvac">HVAC</SelectItem>
                      <SelectItem value="plumbing">Plumbing</SelectItem>
                      <SelectItem value="electrical">Electrical</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Urgency</Label>
                  <Select
                    value={customerInfo.urgency}
                    onValueChange={(value: UrgencyLevel) =>
                      setCustomerInfo({ ...customerInfo, urgency: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Problem Description */}
              <div className="space-y-2">
                <Label htmlFor="notes">Problem Description (optional)</Label>
                <textarea
                  id="notes"
                  placeholder="AC not cooling, house is 85°F..."
                  value={customerInfo.notes}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, notes: e.target.value })}
                  className="w-full p-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={3}
                />
              </div>
            </>
          ) : (
            <>
              {/* Back Button */}
              <button
                onClick={handleBack}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
                disabled={creating}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to customer info
              </button>

              {/* Customer Summary */}
              <CustomerSummary
                name={customerInfo.name}
                phone={customerInfo.phone}
                address={customerInfo.address}
              />

              {/* Date Picker */}
              <DatePicker
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                disabled={creating}
              />

              {/* Time Slots */}
              {selectedDate && (
                <TimeSlotGrid
                  slots={slots}
                  selectedSlot={selectedSlot}
                  onSelectSlot={setSelectedSlot}
                  loading={loadingSlots}
                  error={slotsError}
                  disabled={creating}
                />
              )}
            </>
          )}

          {/* Error Display */}
          {displayError && step === 'schedule' && !loadingSlots && slots.length > 0 && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <Clock className="w-5 h-5 shrink-0" />
              <span className="text-sm">{displayError}</span>
            </div>
          )}
        </CardContent>

        {/* Footer Actions */}
        <div className="border-t p-4 space-y-2 shrink-0 bg-white">
          {step === 'info' ? (
            <>
              <Button className="w-full" onClick={handleNext}>
                Next
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
              <Button variant="ghost" className="w-full" onClick={onClose}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              {selectedSlot && (
                <div className="text-center text-sm text-gray-600 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  {format(selectedDate!, 'EEEE, MMMM d')} at {selectedSlot.label}
                </div>
              )}

              <Button
                className="w-full"
                onClick={handleCreate}
                disabled={!selectedSlot || creating}
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Job...
                  </>
                ) : (
                  'Create Job'
                )}
              </Button>

              <Button
                variant="ghost"
                className="w-full"
                onClick={onClose}
                disabled={creating}
              >
                Cancel
              </Button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
