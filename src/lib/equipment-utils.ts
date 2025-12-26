import { AirVent, Flame, ThermometerSun, Droplets, Zap, Wrench, type LucideIcon } from 'lucide-react';

/**
 * Equipment type categories and their associated icons
 */
const EQUIPMENT_ICONS: Record<string, LucideIcon> = {
  // HVAC - Cooling
  'ac': AirVent,
  'air conditioner': AirVent,
  'air conditioning': AirVent,
  'a/c': AirVent,
  'cooling': AirVent,
  'central air': AirVent,
  'mini split': AirVent,
  'ductless': AirVent,

  // HVAC - Heating
  'furnace': Flame,
  'heater': Flame,
  'heating': Flame,
  'boiler': Flame,
  'gas furnace': Flame,
  'oil furnace': Flame,

  // HVAC - Heat Pump
  'heat pump': ThermometerSun,
  'heatpump': ThermometerSun,
  'hvac': ThermometerSun,
  'hvac system': ThermometerSun,

  // Plumbing
  'water heater': Droplets,
  'tankless': Droplets,
  'plumbing': Droplets,
  'pipe': Droplets,
  'drain': Droplets,
  'sewer': Droplets,
  'toilet': Droplets,
  'faucet': Droplets,

  // Electrical
  'electrical': Zap,
  'panel': Zap,
  'breaker': Zap,
  'outlet': Zap,
  'wiring': Zap,
  'generator': Zap,
};

/**
 * Get the appropriate icon for an equipment type
 * Returns Wrench as default for unknown equipment
 */
export function getEquipmentIcon(equipmentType: string | null | undefined): LucideIcon {
  if (!equipmentType) return Wrench;

  const normalized = equipmentType.toLowerCase().trim();

  // Check for exact match first
  if (EQUIPMENT_ICONS[normalized]) {
    return EQUIPMENT_ICONS[normalized];
  }

  // Check if any key is contained in the equipment type
  for (const [key, icon] of Object.entries(EQUIPMENT_ICONS)) {
    if (normalized.includes(key)) {
      return icon;
    }
  }

  return Wrench;
}

/**
 * Parse and normalize equipment age to a clean format
 * Input: "5 years old", "installed 2019", "about 10 years", "15-20 years"
 * Output: "5 years", "6 years", "~10 years", "15-20 years"
 */
export function formatEquipmentAge(age: string | null | undefined): string | null {
  if (!age) return null;

  const normalized = age.toLowerCase().trim();

  // Already clean format
  if (/^\d+\s*years?$/.test(normalized)) {
    return normalized.replace(/\s+/, ' ');
  }

  // "X years old" -> "X years"
  const yearsOldMatch = normalized.match(/(\d+)\s*years?\s*old/i);
  if (yearsOldMatch) {
    const years = parseInt(yearsOldMatch[1], 10);
    return `${years} ${years === 1 ? 'year' : 'years'}`;
  }

  // "installed YYYY" or "from YYYY" -> calculate years
  const yearMatch = normalized.match(/(?:installed|from|since|in)\s*(19|20)\d{2}/i);
  if (yearMatch) {
    const installYear = parseInt(normalized.match(/(19|20)\d{2}/)?.[0] || '0', 10);
    if (installYear) {
      const currentYear = new Date().getFullYear();
      const years = currentYear - installYear;
      return `${years} ${years === 1 ? 'year' : 'years'}`;
    }
  }

  // "about X years" or "approximately X years" -> "~X years"
  const aboutMatch = normalized.match(/(?:about|approximately|around|roughly)\s*(\d+)\s*years?/i);
  if (aboutMatch) {
    const years = parseInt(aboutMatch[1], 10);
    return `~${years} ${years === 1 ? 'year' : 'years'}`;
  }

  // Range "X-Y years" or "X to Y years"
  const rangeMatch = normalized.match(/(\d+)\s*[-–to]\s*(\d+)\s*years?/i);
  if (rangeMatch) {
    return `${rangeMatch[1]}-${rangeMatch[2]} years`;
  }

  // Just a number (assume years)
  const numberMatch = normalized.match(/^(\d+)$/);
  if (numberMatch) {
    const years = parseInt(numberMatch[1], 10);
    return `${years} ${years === 1 ? 'year' : 'years'}`;
  }

  // Return original if we can't parse
  return age;
}

/**
 * Get equipment age category for styling
 * Returns: 'new' (0-5), 'mid' (6-12), 'old' (13-19), 'replacement' (20+)
 */
export function getEquipmentAgeCategory(
  age: string | null | undefined
): 'new' | 'mid' | 'old' | 'replacement' | null {
  if (!age) return null;

  // Extract the first number from the age string
  const match = age.match(/(\d+)/);
  if (!match) return null;

  const years = parseInt(match[1], 10);

  if (years <= 5) return 'new';
  if (years <= 12) return 'mid';
  if (years <= 19) return 'old';
  return 'replacement';
}

/**
 * Get display label for equipment type
 * Normalizes common variations to clean display names
 */
export function formatEquipmentType(type: string | null | undefined): string | null {
  if (!type) return null;

  const normalized = type.toLowerCase().trim();

  // Map to display names
  const displayNames: Record<string, string> = {
    'ac': 'AC Unit',
    'a/c': 'AC Unit',
    'air conditioner': 'AC Unit',
    'air conditioning': 'AC Unit',
    'central air': 'Central AC',
    'mini split': 'Mini Split',
    'ductless': 'Ductless Unit',
    'furnace': 'Furnace',
    'gas furnace': 'Gas Furnace',
    'oil furnace': 'Oil Furnace',
    'heater': 'Heater',
    'heat pump': 'Heat Pump',
    'heatpump': 'Heat Pump',
    'water heater': 'Water Heater',
    'tankless': 'Tankless Water Heater',
    'boiler': 'Boiler',
  };

  // Check for exact match
  if (displayNames[normalized]) {
    return displayNames[normalized];
  }

  // Check if any key is contained
  for (const [key, displayName] of Object.entries(displayNames)) {
    if (normalized.includes(key)) {
      return displayName;
    }
  }

  // Return title-cased original
  return type
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Combine equipment info into a display string
 * Example: "Carrier AC Unit (12 years)"
 */
export function formatEquipmentDisplay(
  type: string | null | undefined,
  brand?: string | null,
  age?: string | null
): string | null {
  if (!type && !brand) return null;

  const parts: string[] = [];

  if (brand) {
    parts.push(brand);
  }

  if (type) {
    parts.push(formatEquipmentType(type) || type);
  }

  let display = parts.join(' ');

  const formattedAge = formatEquipmentAge(age);
  if (formattedAge) {
    display += ` (${formattedAge})`;
  }

  return display || null;
}
