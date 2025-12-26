'use client';

import { Building, LogOut } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface AccountSectionProps {
  businessName: string;
  phone: string;
  signingOut: boolean;
  onBusinessNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSignOut: () => void;
}

export function AccountSection({
  businessName,
  phone,
  signingOut,
  onBusinessNameChange,
  onSignOut,
}: AccountSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="w-5 h-5" />
          Account
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Business name */}
        <div>
          <label className="text-sm font-medium text-navy-700 mb-2 block">
            Business Name
          </label>
          <input
            type="text"
            name="businessName"
            value={businessName}
            onChange={onBusinessNameChange}
            required
            className="w-full px-4 py-3 border border-navy-200 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
          />
        </div>

        {/* Business phone (display only) */}
        <div>
          <label className="text-sm font-medium text-navy-700 mb-2 block">
            Business Phone
          </label>
          <div className="px-4 py-3 border border-navy-200 rounded-lg bg-navy-50 text-navy-600">
            {phone || 'Not set'}
          </div>
          <p className="mt-1 text-xs text-navy-400">
            Your number for receiving SMS alerts
          </p>
        </div>

        {/* Sign out link */}
        <div className="pt-4 border-t border-navy-100">
          <Button
            type="button"
            variant="ghost"
            onClick={onSignOut}
            disabled={signingOut}
            className="text-error-600 hover:text-error-700 hover:bg-error-50"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {signingOut ? 'Signing Out...' : 'Sign Out'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
