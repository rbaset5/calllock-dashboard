'use client';

import { Switch } from './switch';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

/**
 * Toggle component - backwards compatible wrapper around shadcn Switch
 * @deprecated Use Switch component directly for new code
 */
export function Toggle({ checked, onChange, disabled = false }: ToggleProps) {
  return (
    <Switch
      checked={checked}
      onCheckedChange={onChange}
      disabled={disabled}
    />
  );
}
