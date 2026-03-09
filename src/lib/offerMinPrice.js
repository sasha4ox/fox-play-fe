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
 * @param {string} currency - Currency code (UAH, EUR, USD, RUB, etc.)
 * @returns {number} Minimum price per 100kk for that currency, or 0 if unknown
 */
export function getMinPriceFor100kk(currency) {
  if (!currency) return 0;
  return MIN_PRICE_PER_100KK[currency] ?? 0;
}
