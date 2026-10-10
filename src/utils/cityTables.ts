/**
 * City-based Tables / Counters Directory
 * Represents the physical tables/counters available in each city.
 * Does not define what type of government work happens at each table.
 * Does not create fixed service-to-table mappings.
 */

export const getCityTables = (_city?: string, totalCounters?: number): string[] => {
  // Default to 6 physical tables per city if not configured
  const count = Math.max(6, totalCounters || 6);
  const tables: string[] = [];
  for (let i = 1; i <= count; i++) {
    tables.push(`C-${i}`);
  }
  return tables;
};

/**
 * Standardize counter name display (e.g. 'C-01' -> 'C-1' or vice versa)
 */
export const normalizeTableNumber = (val?: string): string => {
  if (!val) return 'C-1';
  const match = val.match(/C-?0*(\d+)/i);
  if (match) {
    return `C-${match[1]}`;
  }
  return val.trim();
};

/**
 * Format counter code to canonical 2-digit format (e.g. 'C-1', 'C1', '1' -> 'C-01')
 */
export const formatCounterDisplay = (val?: string): string => {
  if (!val) return 'C-01';
  const match = val.match(/\d+/);
  if (match) {
    const num = parseInt(match[0], 10);
    return `C-${num < 10 ? '0' + num : num}`;
  }
  return val.trim();
};

