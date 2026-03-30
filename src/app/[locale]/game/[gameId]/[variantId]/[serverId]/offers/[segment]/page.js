'use client';

import { useParams } from 'next/navigation';
import { isUuidSegment } from '@/lib/games';
import OfferPDPPage from '../offer-pdp-page';
import GameOffersListPage from '../game-offers-list-page';

export default function OffersSegmentPage() {
  const params = useParams();
  const segment = params?.segment;
  if (isUuidSegment(segment)) {
    return <OfferPDPPage />;
  }
  return <GameOffersListPage categorySegment={segment} />;
}
