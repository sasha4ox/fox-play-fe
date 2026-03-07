/**
 * Semantic text colors for order status labels (used on order chat page and chat list).
 * Use these for the status word only; keep panel/list backgrounds neutral.
 */
const STATUS_TEXT_COLORS = {
  CREATED: null, // resolved by payment method below
  PAID: '#2e7d32',
  DELIVERED: '#2e7d32',
  COMPLETED: '#7b1fa2',
  CANCELED: '#9e9e9e',
  DISPUTED: '#c62828',
};

/** CREATED + card/crypto manual = waiting for money → amber; otherwise blue (messages / balance) */
const CREATED_WAITING_MONEY = '#b45309';
const CREATED_DEFAULT = '#0d47a1';

/**
 * Returns a CSS color string for the given order status (and optional payment method).
 * Use for status label text only; panel backgrounds should stay neutral.
 * @param {string} [status] - Order status (e.g. CREATED, PAID, COMPLETED).
 * @param {string} [paymentMethod] - e.g. CARD_MANUAL, CRYPTO_MANUAL (only affects CREATED).
 * @returns {string} Hex color for the status text.
 */
export function getOrderStatusTextColor(status, paymentMethod) {
  if (!status) return '#757575';
  if (status === 'CREATED') {
    return paymentMethod === 'CARD_MANUAL' || paymentMethod === 'CRYPTO_MANUAL'
      ? CREATED_WAITING_MONEY
      : CREATED_DEFAULT;
  }
  return STATUS_TEXT_COLORS[status] ?? '#616161';
}
