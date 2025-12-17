'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  PhoneCall,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  PartyPopper,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPhoneDisplay } from '@/lib/carrier-detection';

interface StepTestCallProps {
  businessPhone: string;
  callLockNumber: string;
  onComplete: () => void;
  onBack: () => void;
}

type TestStatus = 'idle' | 'calling' | 'waiting' | 'success' | 'failed';

export function StepTestCall({
  businessPhone,
  callLockNumber,
  onComplete,
  onBack,
}: StepTestCallProps) {
  const [status, setStatus] = useState<TestStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleStartTest = async () => {
    setStatus('calling');
    setErrorMessage(null);

    try {
      // Initiate test call via API
      const response = await fetch('/api/onboarding/test-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessPhone }),
      });

      if (!response.ok) {
        throw new Error('Failed to initiate test call');
      }

      setStatus('waiting');

      // Poll for test result (in production, could use WebSocket or SSE)
      const checkResult = async (attempts: number = 0): Promise<boolean> => {
        if (attempts >= 30) return false; // 30 second timeout

        await new Promise((resolve) => setTimeout(resolve, 1000));

        const resultResponse = await fetch('/api/onboarding/test-call/status');
        if (!resultResponse.ok) return false;

        const result = await resultResponse.json();

        if (result.status === 'completed') {
          return result.success;
        } else if (result.status === 'failed') {
          setErrorMessage(result.error || 'Test call failed');
          return false;
        }

        // Still waiting, check again
        return checkResult(attempts + 1);
      };

      const success = await checkResult();
      setStatus(success ? 'success' : 'failed');

      if (!success && !errorMessage) {
        setErrorMessage('The test call did not complete. Please check your call forwarding setup.');
      }
    } catch (error) {
      console.error('Test call error:', error);
      setStatus('failed');
      setErrorMessage('Failed to start test call. Please try again.');
    }
  };

  const handleRetry = () => {
    setStatus('idle');
    setErrorMessage(null);
  };

  // Success state
  if (status === 'success') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-in zoom-in">
            <PartyPopper className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-navy-800">You&apos;re All Set!</h2>
          <p className="text-gray-600 mt-2">
            CallSeal is ready to handle your missed calls
          </p>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            <span className="font-medium text-emerald-800">Call forwarding verified!</span>
          </div>
          <p className="text-sm text-emerald-700">
            When you miss a call, our AI receptionist will answer, qualify the lead,
            and send you an SMS with all the details.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 mb-2">What happens next?</h4>
          <ul className="space-y-2 text-sm text-blue-700">
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 bg-blue-200 rounded-full flex items-center justify-center shrink-0 text-xs font-medium">1</span>
              <span>You&apos;ll get an SMS when a new lead comes in</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 bg-blue-200 rounded-full flex items-center justify-center shrink-0 text-xs font-medium">2</span>
              <span>Reply to the SMS or use the app to manage leads</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 bg-blue-200 rounded-full flex items-center justify-center shrink-0 text-xs font-medium">3</span>
              <span>Book appointments instantly with one tap</span>
            </li>
          </ul>
        </div>

        <Button onClick={onComplete} className="w-full" size="lg">
          Go to Dashboard
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <PhoneCall className="w-8 h-8 text-primary-600" />
        </div>
        <h2 className="text-2xl font-bold text-navy-800">Test Your Setup</h2>
        <p className="text-gray-600 mt-2">
          Let&apos;s make sure everything is working correctly
        </p>
      </div>

      <div className="space-y-4">
        {/* Test Instructions */}
        <div className="border-2 border-gray-200 rounded-xl p-6 space-y-4">
          <h3 className="font-medium text-gray-900">Here&apos;s what will happen:</h3>
          <ol className="space-y-3">
            <li className="flex gap-3 text-sm">
              <span className="w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center shrink-0 font-medium">
                1
              </span>
              <span className="text-gray-700 pt-0.5">
                We&apos;ll call <strong>{formatPhoneDisplay(businessPhone)}</strong>
              </span>
            </li>
            <li className="flex gap-3 text-sm">
              <span className="w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center shrink-0 font-medium">
                2
              </span>
              <span className="text-gray-700 pt-0.5">
                <strong>Don&apos;t answer</strong> - let it ring through
              </span>
            </li>
            <li className="flex gap-3 text-sm">
              <span className="w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center shrink-0 font-medium">
                3
              </span>
              <span className="text-gray-700 pt-0.5">
                The call should forward to CallSeal
              </span>
            </li>
            <li className="flex gap-3 text-sm">
              <span className="w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center shrink-0 font-medium">
                4
              </span>
              <span className="text-gray-700 pt-0.5">
                Our AI will answer and confirm the test
              </span>
            </li>
          </ol>
        </div>

        {/* Status Display */}
        {status === 'calling' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            <span className="text-blue-800">Initiating test call...</span>
          </div>
        )}

        {status === 'waiting' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
              <span className="font-medium text-amber-800">Calling your business phone...</span>
            </div>
            <p className="text-sm text-amber-700">
              Don&apos;t answer! Let it ring and forward to CallSeal.
            </p>
          </div>
        )}

        {status === 'failed' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <XCircle className="w-5 h-5 text-red-600" />
              <span className="font-medium text-red-800">Test Failed</span>
            </div>
            {errorMessage && <p className="text-sm text-red-700">{errorMessage}</p>}
            <div className="text-sm text-red-700">
              <p className="font-medium">Common issues:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Call forwarding not set up correctly</li>
                <li>Wrong CallSeal number in forwarding settings</li>
                <li>Carrier requires additional activation</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button type="button" variant="ghost" onClick={onBack} className="flex-1">
          Back
        </Button>
        {status === 'idle' && (
          <Button onClick={handleStartTest} className="flex-1">
            Start Test Call
            <PhoneCall className="w-4 h-4 ml-2" />
          </Button>
        )}
        {status === 'failed' && (
          <Button onClick={handleRetry} className="flex-1">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        )}
        {(status === 'calling' || status === 'waiting') && (
          <Button disabled className="flex-1">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Testing...
          </Button>
        )}
      </div>

      {status === 'idle' && (
        <Button
          variant="ghost"
          onClick={onComplete}
          className="w-full text-gray-500"
        >
          Skip test and go to dashboard
        </Button>
      )}
    </div>
  );
}
