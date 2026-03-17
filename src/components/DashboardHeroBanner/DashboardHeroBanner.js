'use client';

import { useEffect, useMemo } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import Image from 'next/image';
import Box from '@mui/material/Box';
import { useTranslations } from 'next-intl';
import { HERO_BANNER_SLIDES } from './heroBanners';

const AUTOPLAY_DELAY_MS = 5000;

export default function DashboardHeroBanner() {
  const t = useTranslations('Dashboard');
  const slides = HERO_BANNER_SLIDES;

  const autoplay = useMemo(
    () => Autoplay({ delay: AUTOPLAY_DELAY_MS, stopOnInteraction: false, stopOnMouseEnter: true }),
    []
  );

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start' }, [autoplay]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => {
      if (mq.matches && emblaApi) {
        emblaApi.plugins().autoplay?.stop();
      }
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      emblaApi.plugins().autoplay?.stop();
    }
  }, [emblaApi]);

  if (!slides.length) {
    return null;
  }

  return (
    <Box
      component="section"
      aria-roledescription="carousel"
      aria-label={t('heroBannerCarouselLabel')}
      sx={{
        position: 'relative',
        mb: { xs: 1.5, sm: 3 },
      }}
    >
      <Box
        ref={emblaRef}
        sx={{
          overflow: 'hidden',
          borderRadius: { xs: 0, sm: 2 },
          border: { xs: 'none', sm: '1px solid' },
          borderColor: 'divider',
          bgcolor: { xs: 'transparent', sm: 'background.paper' },
        }}
      >
        <Box sx={{ display: 'flex' }}>
          {slides.map((slide, index) => (
            <Box
              key={slide.src}
              sx={{
                flex: '0 0 100%',
                minWidth: 0,
                position: 'relative',
                aspectRatio: { xs: '16/10', sm: '21/9' },
                maxHeight: { xs: 220, sm: 280, md: 320 },
              }}
            >
              <Image
                src={slide.src}
                alt={slide.alt}
                fill
                sizes="(max-width: 600px) 100vw, (max-width: 1200px) 90vw, 1200px"
                priority={index === 0}
                style={{ objectFit: 'cover' }}
              />
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
