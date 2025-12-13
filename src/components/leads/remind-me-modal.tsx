'use client';

import { useState } from 'react';
import { Lead } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Clock } from 'lucide-react';
import { addHours, addDays, format } from 'date-fns';

interface RemindMeModalProps {
  lead: Lead;
  onClose: () => void;
  onSetReminder: (lead: Lead, remindAt: string) => void;
}

type QuickOption =
  | { label: string; hours: number; getTomorrow?: never }
  | { label: string; hours?: never; getTomorrow: () => Date };

const quickOptions: QuickOption[] = [
  { label: 'In 1 hour', hours: 1 },
  { label: 'In 2 hours', hours: 2 },
  { label: 'In 4 hours', hours: 4 },
  { label: 'Tomorrow morning', getTomorrow: () => {
    const tomorrow = addDays(new Date(), 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow;
  }},
  { label: 'Tomorrow afternoon', getTomorrow: () => {
    const tomorrow = addDays(new Date(), 1);
    tomorrow.setHours(14, 0, 0, 0);
    return tomorrow;
  }},
];

export function RemindMeModal({ lead, onClose, onSetReminder }: RemindMeModalProps) {
  const handleQuickOption = (option: QuickOption) => {
    let remindAt: Date;

    if (option.hours !== undefined) {
      remindAt = addHours(new Date(), option.hours);
    } else if (option.getTomorrow) {
      remindAt = option.getTomorrow();
    } else {
      return;
    }

    onSetReminder(lead, remindAt.toISOString());
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md animate-in slide-in-from-bottom-4">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Remind Me Later
          </CardTitle>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-gray-600 mb-4">
            Snooze follow-up for <strong>{lead.customer_name}</strong>
          </p>

          {quickOptions.map((option, index) => {
            let timeDisplay = '';
            if (option.hours !== undefined) {
              const time = addHours(new Date(), option.hours);
              timeDisplay = format(time, 'h:mm a');
            } else if (option.getTomorrow) {
              const time = option.getTomorrow();
              timeDisplay = format(time, 'EEE h:mm a');
            }

            return (
              <Button
                key={index}
                variant="outline"
                className="w-full justify-between h-12"
                onClick={() => handleQuickOption(option)}
              >
                <span>{option.label}</span>
                <span className="text-gray-500 text-sm">{timeDisplay}</span>
              </Button>
            );
          })}

          <div className="pt-2">
            <Button variant="ghost" className="w-full" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
