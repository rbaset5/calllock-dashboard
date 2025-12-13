'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Zap, Activity, Wrench } from 'lucide-react';

interface DiagnosticContextProps {
  problemDuration?: string | null;
  problemOnset?: string | null;
  problemPattern?: string | null;
  customerAttemptedFixes?: string | null;
  className?: string;
}

/**
 * DiagnosticContext displays problem diagnostic information collected during the call.
 * Shows duration, onset, pattern, and what the customer already tried.
 * Only renders if at least one field has data.
 */
export function DiagnosticContext({
  problemDuration,
  problemOnset,
  problemPattern,
  customerAttemptedFixes,
  className,
}: DiagnosticContextProps) {
  // Don't render if no diagnostic data
  const hasData = problemDuration || problemOnset || problemPattern || customerAttemptedFixes;
  if (!hasData) return null;

  const items = [
    { icon: Clock, label: 'Duration', value: problemDuration },
    { icon: Zap, label: 'Started', value: problemOnset },
    { icon: Activity, label: 'Pattern', value: problemPattern },
    { icon: Wrench, label: 'Customer Tried', value: customerAttemptedFixes },
  ].filter(item => item.value);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-500" />
          Diagnostic Context
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <dl className="space-y-2">
          {items.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-3">
              <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <dt className="text-xs text-gray-500 uppercase tracking-wide">{label}</dt>
                <dd className="text-sm text-gray-900">{value}</dd>
              </div>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

/**
 * Compact inline version for use in cards or smaller spaces
 */
export function DiagnosticContextInline({
  problemDuration,
  problemOnset,
  problemPattern,
  customerAttemptedFixes,
}: DiagnosticContextProps) {
  const hasData = problemDuration || problemOnset || problemPattern || customerAttemptedFixes;
  if (!hasData) return null;

  const parts = [
    problemDuration && `Duration: ${problemDuration}`,
    problemOnset && `Started: ${problemOnset}`,
    problemPattern && `Pattern: ${problemPattern}`,
    customerAttemptedFixes && `Tried: ${customerAttemptedFixes}`,
  ].filter(Boolean);

  return (
    <p className="text-xs text-gray-500">
      {parts.join(' · ')}
    </p>
  );
}
