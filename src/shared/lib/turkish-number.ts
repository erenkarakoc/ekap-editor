import Decimal from 'decimal.js';

// Parse Turkish number format (1.234,56) to Decimal
export function parseTurkishNumber(value: string): Decimal {
  if (!value || typeof value !== 'string' || value.trim() === '') return new Decimal(0);
  try {
    // Remove thousand separators (dots) and replace comma with period
    const normalized = value.replace(/\./g, '').replace(',', '.');
    return new Decimal(normalized);
  } catch (e) {
    console.error(`Failed to parse Turkish number: ${value}`, e);
    return new Decimal(0);
  }
}

// Format Decimal to Turkish number format
export function formatTurkishNumber(value: Decimal, decimals: number = 2): string {
  const fixed = value.toFixed(decimals);
  const [intPart, decPart] = fixed.split('.');

  // Add thousand separators
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `${formattedInt},${decPart}`;
}
