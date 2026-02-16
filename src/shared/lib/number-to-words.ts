import Decimal from 'decimal.js';

const ONES = ['', 'BİR', 'İKİ', 'ÜÇ', 'DÖRT', 'BEŞ', 'ALTI', 'YEDİ', 'SEKİZ', 'DOKUZ'];
const TENS = ['', 'ON', 'YİRMİ', 'OTUZ', 'KIRK', 'ELLİ', 'ALTMIŞ', 'YETMİŞ', 'SEKSEN', 'DOKSAN'];
const SCALES = ['', 'BİN', 'MİLYON', 'MİLYAR', 'TRİLYON'];

// Convert a 3-digit group (0-999) to Turkish words
function groupToWords(n: number, isThousandsGroup: boolean): string {
  const parts: string[] = [];

  const hundreds = Math.floor(n / 100);
  const remainder = n % 100;
  const tens = Math.floor(remainder / 10);
  const ones = remainder % 10;

  // Hundreds: "BİR YÜZ" → "YÜZ"
  if (hundreds > 0) {
    if (hundreds === 1) {
      parts.push('YÜZ');
    } else {
      parts.push(ONES[hundreds], 'YÜZ');
    }
  }

  if (tens > 0) {
    parts.push(TENS[tens]);
  }

  // For the thousands group, "BİR BİN" → "BİN" (skip "BİR" when the group is exactly 1)
  if (ones > 0) {
    if (isThousandsGroup && n === 1) {
      // Skip "BİR" — the scale word "BİN" will be added by the caller
    } else {
      parts.push(ONES[ones]);
    }
  }

  return parts.join(' ');
}

/**
 * Convert a Decimal amount to Turkish words.
 *
 * Examples:
 *   numberToTurkishWords(new Decimal('8711280.00'), 'TRY')
 *     → "SEKİZ MİLYON YEDİ YÜZ ON BİR BİN İKİ YÜZ SEKSEN TRY"
 *   numberToTurkishWords(new Decimal('1000.50'), 'TRY')
 *     → "BİN TRY ELLİ KRŞ"
 *   numberToTurkishWords(new Decimal('0.00'), 'TRY')
 *     → "SIFIR TRY"
 */
export function numberToTurkishWords(amount: Decimal, currency: string): string {
  const abs = amount.abs();
  const integerPart = abs.floor();
  const decimalPart = abs.minus(integerPart).times(100).round().toNumber();

  // Integer part to words
  let integerWords: string;

  if (integerPart.isZero()) {
    integerWords = 'SIFIR';
  } else {
    const intStr = integerPart.toFixed(0);
    // Split into groups of 3 from right
    const groups: number[] = [];
    for (let i = intStr.length; i > 0; i -= 3) {
      const start = Math.max(0, i - 3);
      groups.push(parseInt(intStr.slice(start, i), 10));
    }

    const parts: string[] = [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const group = groups[i];
      if (group === 0) continue;

      const isThousands = i === 1;
      const words = groupToWords(group, isThousands);
      const scale = SCALES[i] || '';

      if (words) {
        parts.push(words);
      }
      if (scale) {
        parts.push(scale);
      }
    }

    integerWords = parts.join(' ');
  }

  // Build result
  let result = `${integerWords} ${currency}`;

  // Kuruş (decimal) part
  if (decimalPart > 0) {
    const kurusWords = groupToWords(decimalPart, false);
    result += ` ${kurusWords} KRŞ`;
  }

  return result;
}
