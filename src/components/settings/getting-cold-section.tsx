'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface GettingColdSectionProps {
  thresholdHours: number;
  onThresholdChange: (hours: number) => void;
}

export function GettingColdSection({
  thresholdHours,
  onThresholdChange,
}: GettingColdSectionProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 1 && value <= 168) {
      onThresholdChange(value);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-slate-400">
            ac_unit
          </span>
          Lead Aging
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-2">
            &ldquo;Getting Cold&rdquo; threshold
          </label>
          <p className="text-sm text-slate-500 mb-3">
            Mark leads as getting cold after this many hours without action.
          </p>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min={1}
              max={168}
              value={thresholdHours}
              onChange={handleChange}
              className="w-24"
            />
            <span className="text-sm text-slate-500">hours</span>
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
          <span className="material-symbols-outlined text-blue-500 text-[18px] mt-0.5">
            info
          </span>
          <p className="text-sm text-blue-700">
            Leads won&apos;t be auto-archived. You decide when to mark them lost.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
