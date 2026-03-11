/**
 * Minimum price per 100kk adena by currency.
 * Used to validate offer creation/update and to block buying when price is below minimum.
 */
export const MIN_PRICE_PER_100KK = {
  UAH: 60,
  EUR: 1,
  USD: 1.5,
  RUB: 100
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
