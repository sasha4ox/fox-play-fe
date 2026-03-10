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
 * Minimum price for a given adena unit (e.g. per 1kk or per 100kk).
 * @param {string} currency - Currency code (UAH, EUR, USD, RUB, etc.)
 * @param {number} adenaPriceUnitKk - Display unit in kk (e.g. 100 = per 100kk, 1 = per 1kk)
 * @returns {number} Minimum price per that unit for that currency, or 0 if unknown
 */
export function getMinPriceForUnit(currency, adenaPriceUnitKk = 100) {
  if (!currency) return 0;
  const minPer100kk = MIN_PRICE_PER_100KK[currency] ?? 0;
  return minPer100kk * (adenaPriceUnitKk / 100);
}

/**
 * @param {string} currency - Currency code (UAH, EUR, USD, RUB, etc.)
 * @returns {number} Minimum price per 100kk for that currency, or 0 if unknown
 */
export function getMinPriceFor100kk(currency) {
  return getMinPriceForUnit(currency, 100);
}
