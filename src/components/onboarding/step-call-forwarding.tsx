'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  PhoneForwarded,
  ArrowRight,
  Copy,
  Check,
  ChevronDown,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Carrier,
  getCarrierInfo,
  getAvailableCarriers,
  formatForwardingCode,
  formatPhoneDisplay,
} from '@/lib/carrier-detection';

interface StepCallForwardingProps {
  initialData: {
    carrier?: Carrier;
    businessPhone: string;
  };
  callLockNumber: string;
  onNext: (data: { carrier: Carrier; forwardingSetup: boolean }) => void;
  onBack: () => void;
}

export function StepCallForwarding({
  initialData,
  callLockNumber,
  onNext,
  onBack,
}: StepCallForwardingProps) {
  const [carrier, setCarrier] = useState<Carrier>(initialData.carrier || 'other');
  const [showCarrierSelect, setShowCarrierSelect] = useState(!initialData.carrier);
  const [copiedCode, setCopiedCode] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const carrierInfo = getCarrierInfo(carrier);
  const carriers = getAvailableCarriers();

  const handleCopyCode = (code: string) => {
    const formattedCode = formatForwardingCode(code, callLockNumber);
    navigator.clipboard.writeText(formattedCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleConfirmSetup = () => {
    setConfirmed(true);
  };

  const handleContinue = () => {
    onNext({ carrier, forwardingSetup: confirmed });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <PhoneForwarded className="w-8 h-8 text-primary-600" />
        </div>
        <h2 className="text-2xl font-bold text-navy-800">Set Up Call Forwarding</h2>
        <p className="text-gray-600 mt-2">
          Forward missed calls from {formatPhoneDisplay(initialData.businessPhone)} to CallLock
        </p>
      </div>

      <div className="space-y-4">
        {/* Carrier Selection */}
        {showCarrierSelect ? (
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">
              Select your phone carrier:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {carriers.map((c) => (
                <button
                  key={c.value}
                  onClick={() => {
                    setCarrier(c.value);
                    setShowCarrierSelect(false);
                  }}
                  className={cn(
                    'p-3 border-2 rounded-lg text-left transition-all',
                    carrier === c.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <span className="text-sm font-medium">{c.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Selected Carrier */}
            <button
              onClick={() => setShowCarrierSelect(true)}
              className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div>
                <span className="text-sm text-gray-500">Carrier:</span>
                <span className="ml-2 font-medium">{carrierInfo.name}</span>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {/* Forwarding Instructions */}
            <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b">
                <h3 className="font-medium text-gray-900">
                  {carrierInfo.forwardingInstructions.description}
                </h3>
              </div>

              <div className="p-4 space-y-4">
                {/* Dial Code (if applicable) */}
                {carrierInfo.forwardingInstructions.type === 'dial_code' &&
                  carrierInfo.forwardingInstructions.enableCode && (
                    <div className="bg-navy-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-2">Dial this code:</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-white px-4 py-3 rounded-lg font-mono text-lg text-navy-800 border">
                          {formatForwardingCode(
                            carrierInfo.forwardingInstructions.enableCode,
                            callLockNumber
                          )}
                        </code>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            handleCopyCode(carrierInfo.forwardingInstructions.enableCode!)
                          }
                        >
                          {copiedCode ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                {/* Steps */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700">Steps:</p>
                  <ol className="space-y-2">
                    {carrierInfo.forwardingInstructions.steps.map((step, index) => (
                      <li key={index} className="flex gap-3 text-sm">
                        <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center shrink-0 text-gray-600 font-medium">
                          {index + 1}
                        </span>
                        <span className="text-gray-700 pt-0.5">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Note */}
                {carrierInfo.forwardingInstructions.note && (
                  <div className="flex gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>{carrierInfo.forwardingInstructions.note}</p>
                  </div>
                )}
              </div>
            </div>

            {/* CallLock Number */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800 mb-2">Your CallLock number:</p>
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-medium text-blue-900">
                  {formatPhoneDisplay(callLockNumber)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(callLockNumber);
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Confirmation */}
            <div className="pt-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={() => setConfirmed(!confirmed)}
                  className="mt-1 w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">
                  I&apos;ve set up call forwarding and it&apos;s working
                </span>
              </label>
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button type="button" variant="ghost" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button
          onClick={handleContinue}
          disabled={!confirmed && !showCarrierSelect}
          className="flex-1"
        >
          {confirmed ? 'Continue' : 'Skip for now'}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      {!confirmed && !showCarrierSelect && (
        <p className="text-xs text-center text-gray-500">
          You can set up call forwarding later, but CallLock won&apos;t receive calls until you do
        </p>
      )}
    </div>
  );
}
