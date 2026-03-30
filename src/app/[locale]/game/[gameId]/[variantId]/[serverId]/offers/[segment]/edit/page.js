'use client';

import { notFound, useParams } from 'next/navigation';
import { isUuidSegment } from '@/lib/games';
import OfferEditPage from '../../offer-edit-page';

export default function OfferEditSegmentPage() {
  const params = useParams();
  const segment = params?.segment;
  if (!isUuidSegment(segment)) {
    notFound();
  }
  return <OfferEditPage />;
}
