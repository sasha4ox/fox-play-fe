const METHOD_KEYS = new Set(['BALANCE', 'CARD_MANUAL', 'CRYPTO_MANUAL', 'IBAN_MANUAL', 'SEPA_MANUAL']);

/**
 * @param {object | null | undefined} ctx — API `paymentContext` from getBalanceHistory
 * @param {(key: string, values?: Record<string, string | number>) => string} tKeyed — maps logical key to message, e.g. `(k, v) => t(\`fh\${k}\`, v)` → fhDepositProvider
 */
export function formatBalancePaymentContext(ctx, tKeyed) {
  if (!ctx) return '—';
  if (ctx.kind === 'deposit') {
    return ctx.provider ? tKeyed('DepositProvider', { provider: ctx.provider }) : tKeyed('DepositSite');
  }
  if (ctx.kind === 'payout_refund') {
    if (ctx.rail === 'crypto') return tKeyed('RefundRailCrypto');
    if (ctx.rail === 'iban') return tKeyed('RefundRailIban');
    return tKeyed('RefundRailCard');
  }
  if (ctx.kind === 'payout_destination') {
    if (ctx.rail === 'card' && ctx.cardLast4) return tKeyed('PayoutToCard', { last4: ctx.cardLast4 });
    if (ctx.rail === 'crypto' && ctx.walletSuffix) return tKeyed('PayoutToWallet', { suffix: ctx.walletSuffix });
    if (ctx.rail === 'iban' && ctx.ibanSuffix) return tKeyed('PayoutToIban', { suffix: ctx.ibanSuffix });
    if (ctx.rail === 'card') return tKeyed('Method_CARD_MANUAL');
    if (ctx.rail === 'crypto') return tKeyed('Method_CRYPTO_MANUAL');
    return tKeyed('Method_IBAN_MANUAL');
  }

  const method = ctx.paymentMethod;
  const methodLabel = METHOD_KEYS.has(method) ? tKeyed(`Method_${method}`) : String(method);
  const parts = [methodLabel];
  if (ctx.platformCardLast4) parts.push(tKeyed('PlatformCard', { last4: ctx.platformCardLast4 }));
  if (ctx.buyerCardLast4) parts.push(tKeyed('BuyerCard', { last4: ctx.buyerCardLast4 }));
  if (ctx.cryptoWalletSuffix) parts.push(tKeyed('PlatformWallet', { suffix: ctx.cryptoWalletSuffix }));
  if (ctx.bankRail === 'iban') parts.push(tKeyed('BankIbanRail'));
  if (ctx.bankRail === 'sepa') parts.push(tKeyed('BankSepaRail'));
  return parts.join(' · ');
}
