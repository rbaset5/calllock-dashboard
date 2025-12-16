'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  StepPhoneNumbers,
  StepCalendar,
  StepBusinessHours,
  StepCallForwarding,
  StepTestCall,
} from '@/components/onboarding';
import { Carrier } from '@/lib/carrier-detection';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

interface DaySchedule {
  dayOfWeek: number;
  dayName: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

interface OnboardingData {
  businessPhone: string;
  cellPhone: string;
  calComConnected: boolean;
  businessHours: DaySchedule[];
  carrier: Carrier;
  forwardingSetup: boolean;
}

// ============================================
// STEPS CONFIGURATION
// ============================================

const STEPS = [
  { id: 1, title: 'Phone Numbers', shortTitle: 'Phone' },
  { id: 2, title: 'Calendar', shortTitle: 'Calendar' },
  { id: 3, title: 'Business Hours', shortTitle: 'Hours' },
  { id: 4, title: 'Call Forwarding', shortTitle: 'Forward' },
  { id: 5, title: 'Test Call', shortTitle: 'Test' },
];

// CallLock's designated number for this user (would come from backend)
const CALLLOCK_NUMBER = process.env.NEXT_PUBLIC_CALLLOCK_NUMBER || '+18885551234';

// ============================================
// COMPONENT
// ============================================

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    businessPhone: '',
    cellPhone: '',
    calComConnected: false,
    businessHours: [],
    carrier: 'other',
    forwardingSetup: false,
  });

  // Load existing onboarding progress
  useEffect(() => {
    const loadProgress = async () => {
      try {
        const response = await fetch('/api/onboarding/progress');
        if (response.ok) {
          const progress = await response.json();
          if (progress.data) {
            setData((prev) => ({ ...prev, ...progress.data }));
          }
          if (progress.currentStep) {
            setCurrentStep(progress.currentStep);
          }
          if (progress.completed) {
            // Already completed onboarding, redirect to dashboard
            router.push('/action');
            return;
          }
        }
      } catch (error) {
        console.error('Failed to load onboarding progress:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProgress();
  }, [router]);

  // Save progress to backend
  const saveProgress = async (stepData: Partial<OnboardingData>, nextStep: number) => {
    setSaving(true);
    try {
      await fetch('/api/onboarding/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          ...stepData,
          currentStep: nextStep,
        }),
      });
    } catch (error) {
      console.error('Failed to save progress:', error);
    } finally {
      setSaving(false);
    }
  };

  // Step handlers
  const handleStep1Next = async (stepData: { businessPhone: string; cellPhone: string }) => {
    setData((prev) => ({ ...prev, ...stepData }));
    await saveProgress(stepData, 2);
    setCurrentStep(2);
  };

  const handleStep2Next = async (stepData: { calComConnected: boolean }) => {
    setData((prev) => ({ ...prev, ...stepData }));
    await saveProgress(stepData, 3);
    setCurrentStep(3);
  };

  const handleStep3Next = async (stepData: { businessHours: DaySchedule[] }) => {
    setData((prev) => ({ ...prev, ...stepData }));
    await saveProgress(stepData, 4);
    setCurrentStep(4);
  };

  const handleStep4Next = async (stepData: { carrier: Carrier; forwardingSetup: boolean }) => {
    setData((prev) => ({ ...prev, ...stepData }));
    await saveProgress(stepData, 5);
    setCurrentStep(5);
  };

  const handleComplete = async () => {
    // Mark onboarding as complete
    await fetch('/api/onboarding/complete', {
      method: 'POST',
    });
    router.push('/action');
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Progress Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          {/* Logo */}
          <div className="text-center mb-4">
            <h1 className="text-xl font-bold text-navy-800">CallLock</h1>
            <p className="text-sm text-gray-500">Setup Wizard</p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;

              return (
                <div key={step.id} className="flex items-center">
                  {/* Step Circle */}
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                        isCompleted
                          ? 'bg-emerald-500 text-white'
                          : isCurrent
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-200 text-gray-500'
                      )}
                    >
                      {isCompleted ? <Check className="w-4 h-4" /> : step.id}
                    </div>
                    <span
                      className={cn(
                        'text-xs mt-1 hidden sm:block',
                        isCurrent ? 'text-primary-600 font-medium' : 'text-gray-400'
                      )}
                    >
                      {step.shortTitle}
                    </span>
                  </div>

                  {/* Connector Line */}
                  {index < STEPS.length - 1 && (
                    <div
                      className={cn(
                        'w-8 sm:w-12 h-0.5 mx-1',
                        currentStep > step.id ? 'bg-emerald-500' : 'bg-gray-200'
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          {currentStep === 1 && (
            <StepPhoneNumbers
              initialData={{
                businessPhone: data.businessPhone,
                cellPhone: data.cellPhone,
              }}
              onNext={handleStep1Next}
            />
          )}

          {currentStep === 2 && (
            <StepCalendar
              initialData={{ calComConnected: data.calComConnected }}
              onNext={handleStep2Next}
              onBack={handleBack}
            />
          )}

          {currentStep === 3 && (
            <StepBusinessHours
              initialData={{ businessHours: data.businessHours }}
              onNext={handleStep3Next}
              onBack={handleBack}
            />
          )}

          {currentStep === 4 && (
            <StepCallForwarding
              initialData={{
                carrier: data.carrier,
                businessPhone: data.businessPhone,
              }}
              callLockNumber={CALLLOCK_NUMBER}
              onNext={handleStep4Next}
              onBack={handleBack}
            />
          )}

          {currentStep === 5 && (
            <StepTestCall
              businessPhone={data.businessPhone}
              callLockNumber={CALLLOCK_NUMBER}
              onComplete={handleComplete}
              onBack={handleBack}
            />
          )}
        </div>

        {/* Help Link */}
        <p className="text-center text-xs text-gray-400 mt-4">
          Need help?{' '}
          <a href="mailto:support@calllock.ai" className="text-primary-600 hover:underline">
            Contact Support
          </a>
        </p>
      </div>

      {/* Saving Indicator */}
      {saving && (
        <div className="fixed bottom-4 right-4 bg-gray-800 text-white text-sm px-4 py-2 rounded-full">
          Saving...
        </div>
      )}
    </div>
  );
}
