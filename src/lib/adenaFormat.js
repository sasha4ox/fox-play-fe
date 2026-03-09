/**
 * Adena input: 1kk = 1 million, 1kkk = 1 billion.
 * Min quantity and min price per unit: 1kk (1_000_000).
 */

export const MIN_ADENA = 1_000_000; // 1kk
const K = 1_000;
const KK = 1_000_000;
const KKK = 1_000_000_000;

/**
 * Parse user input like "1kk", "2.5kk", "1kkk" into number (adena amount).
 * Also accepts plain numbers.
 * @returns { number | null } Parsed value or null if invalid.
 */
export function parseAdenaInput(value) {
  if (value == null || typeof value !== 'string') return null;
  const s = String(value).trim().toLowerCase().replace(/\s/g, '');
  if (s === '') return null;
  const kkkMatch = s.match(/^([\d.,]+)\s*kkk$/);
  if (kkkMatch) {
    const n = parseFloat(kkkMatch[1].replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.floor(n * KKK);
  }
  const kkMatch = s.match(/^([\d.,]+)\s*kk$/);
  if (kkMatch) {
    const n = parseFloat(kkMatch[1].replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.floor(n * KK);
  }
  const kMatch = s.match(/^([\d.,]+)\s*k$/);
  if (kMatch) {
    const n = parseFloat(kMatch[1].replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.floor(n * K);
  }
  const num = parseFloat(s.replace(/,/g, ''));
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.floor(num);
}

/**
 * Format adena number for display: 1_000_000 -> "1kk", 1_000_000_000 -> "1kkk".
 * @param { number } num
 * @returns { string }
 */
export function formatAdena(num) {
  if (num == null || !Number.isFinite(num) || num < 0) return '0';
  const n = Math.floor(num);
  if (n >= KKK && n % KKK === 0) return `${n / KKK}kkk`;
  if (n >= KK && n % KK === 0) return `${n / KK}kk`;
  if (n >= K && n % K === 0) return `${n / K}k`;
  if (n >= KK) return `${(n / KK).toFixed(2).replace(/\.?0+$/, '')}kk`;
  if (n >= K) return `${(n / K).toFixed(2).replace(/\.?0+$/, '')}k`;
  return String(n);
}

/**
 * Format price per 1 adena for display (pricePer1kk / 1_000_000). Use when showing cost of 1 adena.
 * @param { number } pricePer1kk - Price per 1kk adena (e.g. from offer.price or displayPrice)
 * @param { number } [decimals=6] - Max decimal places
 * @returns { string }
 */
export function formatPricePer1Adena(pricePer1kk, decimals = 6) {
  if (pricePer1kk == null || !Number.isFinite(pricePer1kk) || pricePer1kk < 0) return '0';
  const perOne = pricePer1kk / 1_000_000;
  if (perOne >= 0.01) return perOne.toFixed(Math.min(decimals, 2));
  if (perOne >= 0.0001) return perOne.toFixed(4);
  if (perOne >= 0.000001) return perOne.toFixed(6);
  return perOne.toExponential(2);
}
