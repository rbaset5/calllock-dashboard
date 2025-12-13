import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// shadcn-compatible classname merge utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format phone number for display
export function formatPhone(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');

  // Handle US phone numbers
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits[0] === '1') {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  return phone;
}

// Format phone for tel: link
export function phoneHref(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `tel:+${digits.startsWith('1') ? digits : '1' + digits}`;
}

// Generate map URL based on platform
export function getMapUrl(address: string): string {
  const encoded = encodeURIComponent(address);

  // Check if iOS (for Apple Maps)
  if (typeof window !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent)) {
    return `maps://maps.apple.com/?q=${encoded}`;
  }

  // Default to Google Maps (works on Android and web)
  return `https://www.google.com/maps/search/?api=1&query=${encoded}`;
}

// Get Waze URL
export function getWazeUrl(address: string): string {
  const encoded = encodeURIComponent(address);
  return `https://waze.com/ul?q=${encoded}&navigate=yes`;
}

// Capitalize first letter
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Format service type for display
export function formatServiceType(type: string): string {
  if (type === 'hvac') return 'HVAC';
  return capitalize(type);
}

// Format status for display
export function formatStatus(status: string): string {
  return status.split('_').map(capitalize).join(' ');
}
