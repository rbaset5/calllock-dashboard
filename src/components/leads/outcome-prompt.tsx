'use client';

import { useState } from 'react';
import { Lead, CallbackOutcome } from '@/types/database';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Calendar,
  CheckCircle2,
  Clock,
  PhoneMissed,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OutcomePromptProps {
  lead: Lead;
  open: boolean;
  onClose: () => void;
  onOutcome: (outcome: CallbackOutcome, note?: string, snoozeUntil?: string) => Promise<void>;
  onBook: (lead: Lead) => void;
}

// Outcome option configuration
const OUTCOME_OPTIONS: {
  value: CallbackOutcome;
  label: string;
  description: string;
  icon: typeof CheckCircle2;
  color: string;
}[] = [
  {
    value: 'booked',
    label: 'Booked',
    description: 'Customer scheduled an appointment',
    icon: Calendar,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100',
  },
  {
    value: 'resolved',
    label: 'Resolved',
    description: 'Issue resolved without booking',
    icon: CheckCircle2,
    color: 'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100',
  },
  {
    value: 'try_again',
    label: 'Try Again',
    description: 'Need to follow up later',
    icon: Clock,
    color: 'text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100',
  },
  {
    value: 'no_answer',
    label: 'No Answer',
    description: 'Customer didn\'t pick up',
    icon: PhoneMissed,
    color: 'text-gray-600 bg-gray-50 border-gray-200 hover:bg-gray-100',
  },
];

// Snooze options for "Try Again"
const SNOOZE_OPTIONS = [
  { label: '1 hour', value: 1 },
  { label: '3 hours', value: 3 },
  { label: 'Tomorrow AM', value: 'tomorrow_am' },
  { label: 'Tomorrow PM', value: 'tomorrow_pm' },
];

/**
 * Outcome Prompt Modal
 *
 * Shown after user returns from making a call.
 * Captures what happened: Booked, Resolved, Try Again, or No Answer.
 */
export function OutcomePrompt({
  lead,
  open,
  onClose,
  onOutcome,
  onBook,
}: OutcomePromptProps) {
  const [selectedOutcome, setSelectedOutcome] = useState<CallbackOutcome | null>(null);
  const [showSnoozeOptions, setShowSnoozeOptions] = useState(false);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleOutcomeSelect = (outcome: CallbackOutcome) => {
    setSelectedOutcome(outcome);

    if (outcome === 'try_again') {
      setShowSnoozeOptions(true);
    } else if (outcome === 'booked') {
      // Go directly to booking flow
      onBook(lead);
      onClose();
    } else {
      // For resolved and no_answer, submit immediately
      handleSubmit(outcome);
    }
  };

  const handleSnoozeSelect = async (snoozeValue: number | string) => {
    let snoozeUntil: string;

    if (typeof snoozeValue === 'number') {
      // Hours from now
      snoozeUntil = new Date(Date.now() + snoozeValue * 60 * 60 * 1000).toISOString();
    } else if (snoozeValue === 'tomorrow_am') {
      // Tomorrow at 9 AM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      snoozeUntil = tomorrow.toISOString();
    } else {
      // Tomorrow at 2 PM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(14, 0, 0, 0);
      snoozeUntil = tomorrow.toISOString();
    }

    await handleSubmit('try_again', snoozeUntil);
  };

  const handleSubmit = async (outcome: CallbackOutcome, snoozeUntil?: string) => {
    setLoading(true);
    try {
      await onOutcome(outcome, note || undefined, snoozeUntil);
      // Reset state
      setSelectedOutcome(null);
      setShowSnoozeOptions(false);
      setNote('');
      onClose();
    } catch (error) {
      console.error('Error submitting outcome:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedOutcome(null);
    setShowSnoozeOptions(false);
    setNote('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">How did it go?</DialogTitle>
          <DialogDescription>
            You called <span className="font-medium text-gray-900">{lead.customer_name}</span>.
            What was the outcome?
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-navy-600" />
          </div>
        ) : showSnoozeOptions ? (
          // Snooze selection for "Try Again"
          <div className="space-y-4">
            <p className="text-sm text-gray-600">When should we remind you?</p>
            <div className="grid grid-cols-2 gap-2">
              {SNOOZE_OPTIONS.map((option) => (
                <Button
                  key={option.label}
                  variant="outline"
                  className="h-12"
                  onClick={() => handleSnoozeSelect(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setShowSnoozeOptions(false)}
            >
              Back
            </Button>
          </div>
        ) : (
          // Outcome selection
          <div className="space-y-3">
            {OUTCOME_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => handleOutcomeSelect(option.value)}
                  className={cn(
                    'w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all',
                    'text-left',
                    option.color
                  )}
                >
                  <div className="flex-shrink-0">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{option.label}</p>
                    <p className="text-sm opacity-80">{option.description}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 opacity-50" />
                </button>
              );
            })}

            {/* Skip button */}
            <Button
              variant="ghost"
              className="w-full text-gray-400"
              onClick={handleClose}
            >
              Skip for now
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
