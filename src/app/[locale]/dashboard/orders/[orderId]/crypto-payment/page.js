'use client';

import { useParams, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useEffect } from 'react';

/**
 * Redirect old crypto-payment URL to standalone pay-crypto page.
 * Route: /dashboard/orders/[orderId]/crypto-payment -> /pay-crypto/[orderId]
 */
export default function CryptoPaymentRedirect() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const orderId = params?.orderId;

  useEffect(() => {
    if (orderId && locale) {
      router.replace(`/${locale}/pay-crypto/${orderId}`);
    }
  }, [orderId, locale, router]);

  return null;
}
