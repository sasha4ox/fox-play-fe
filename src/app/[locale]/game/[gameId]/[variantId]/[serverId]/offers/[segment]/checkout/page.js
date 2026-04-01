'use client';

import { useParams, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useEffect } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { isUuidSegment } from '@/lib/games';
import OfferCheckoutClient from '../../offer-checkout-client';

export default function OfferCheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const segment = params?.segment;
  const gameId = params?.gameId;
  const variantId = params?.variantId;
  const serverId = params?.serverId;

  useEffect(() => {
    if (segment == null) return;
    if (!isUuidSegment(segment)) {
      router.replace(`/${locale}/game/${gameId}/${variantId}/${serverId}/offers/${segment}`);
    }
  }, [segment, router, locale, gameId, variantId, serverId]);

  if (!segment || !isUuidSegment(segment)) {
    return (
      <Box sx={{ minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress color="secondary" />
      </Box>
    );
  }

  return <OfferCheckoutClient />;
}
