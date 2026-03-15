/**
 * Minimum price per 100kk adena by currency. Set to 0 so any non-negative price is allowed.
 * Used for validation (price >= 0) and for "below minimum" UI (when min was > 0).
 */
export const MIN_PRICE_PER_100KK = {
  UAH: 0,
  EUR: 0,
  USD: 0,
  RUB: 0,
};

/**
 * Effective unit in kk for calculations. 0 means 1k (1000 adena) = 0.001 kk.
 * @param {number} adenaPriceUnitKk - Raw value: 0 = 1k, 1 = 1kk, 10, 100, 1000
 * @returns {number} Unit in kk (0.001 for 1k, 1 for 1kk, etc.)
 */
export function getEffectiveUnitKk(adenaPriceUnitKk) {
  const v = Number(adenaPriceUnitKk);
  return (v === 0 || Number.isNaN(v)) ? 0.001 : v;
}

/**
 * Minimum price for a given adena unit (e.g. per 1k, 1kk or 100kk).
 * @param {string} currency - Currency code (UAH, EUR, USD, RUB, etc.)
 * @param {number} adenaPriceUnitKk - Raw unit: 0 = 1k (1000 adena), 1 = 1kk, 100 = 100kk
 * @returns {number} Minimum price per that unit for that currency, or 0 if unknown
 */
export function getMinPriceForUnit(currency, adenaPriceUnitKk = 100) {
  if (!currency) return 0;
  const minPer100kk = MIN_PRICE_PER_100KK[currency] ?? 0;
  const unitKk = getEffectiveUnitKk(adenaPriceUnitKk);
  return minPer100kk * (unitKk / 100);
}

/**
 * @param {string} currency - Currency code (UAH, EUR, USD, RUB, etc.)
 * @returns {number} Minimum price per 100kk for that currency, or 0 if unknown
 */
export function getMinPriceFor100kk(currency) {
  return getMinPriceForUnit(currency, 100);
}

/**
 * Format price per unit for display so small values (e.g. 0.005, 0.018) are shown correctly.
 * Uses 2 decimals when >= 0.1, 3 when 0.01–0.1 (e.g. 0.018 for 100kk), then 3–6 for smaller values.
 * Strips trailing zeros in the 0.01–0.1 range so 0.05 displays as "0.05" not "0.050".
 * @param {number} value - Price (e.g. price per 100kk or per 1kk)
 * @returns {string} Formatted string (e.g. "0.018", "0.05", "0.50", "1.23")
 */
export function formatPriceForUnit(value) {
  if (value == null || !Number.isFinite(value) || value < 0) return '0.00';
  if (value >= 100) return value.toFixed(2);
  if (value >= 10) return value.toFixed(2);
  if (value >= 1) return value.toFixed(2);
  if (value >= 0.1) return value.toFixed(2);
  if (value >= 0.01) return value.toFixed(3).replace(/\.?0+$/, '');
  if (value >= 0.001) return value.toFixed(3);
  if (value >= 0.0001) return value.toFixed(4);
  if (value >= 0.00001) return value.toFixed(5);
  if (value >= 0.000001) return value.toFixed(6);
  return value.toExponential(2);
}
