'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import Image from 'next/image';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import { useTranslations } from 'next-intl';
import { HERO_BANNER_SLIDES } from './heroBanners';

const AUTOPLAY_DELAY_MS = 5000;
const MIN_WIDTH_PX = 768;
const DESKTOP_CONTROLS_PX = 1024;

export default function DashboardHeroBanner() {
  const t = useTranslations('Dashboard');
  const slides = HERO_BANNER_SLIDES;

  const autoplay = useMemo(
    () => Autoplay({ delay: AUTOPLAY_DELAY_MS, stopOnInteraction: false, stopOnMouseEnter: true }),
    []
  );

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start' }, [autoplay]);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState([]);

  const onSelect = useCallback((api) => {
    setSelectedIndex(api.selectedScrollSnap());
  }, []);

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
    onSelect(emblaApi);
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((i) => emblaApi?.scrollTo(i), [emblaApi]);

  if (!slides.length) {
    return null;
  }

  const desktopDotsRowSx = {
    display: 'none',
    [`@media (min-width: ${DESKTOP_CONTROLS_PX}px)`]: {
      display: 'flex',
    },
  };

  const desktopNavSx = {
    display: 'none',
    [`@media (min-width: ${DESKTOP_CONTROLS_PX}px)`]: {
      display: 'inline-flex',
    },
  };

  return (
    <Box
      component="section"
      aria-roledescription="carousel"
      aria-label={t('heroBannerCarouselLabel')}
      sx={{
        display: 'none',
        position: 'relative',
        [`@media (min-width: ${MIN_WIDTH_PX}px)`]: {
          display: 'block',
          mb: 3,
        },
      }}
    >
      <Box
        ref={emblaRef}
        sx={{
          overflow: 'hidden',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
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
                aspectRatio: '21/9',
                maxHeight: 280,
                [`@media (min-width: ${DESKTOP_CONTROLS_PX}px)`]: {
                  maxHeight: 320,
                },
              }}
            >
              <Image
                src={slide.src}
                alt={slide.alt}
                fill
                sizes="(max-width: 1023px) 90vw, 1200px"
                priority={index === 0}
                style={{ objectFit: 'cover' }}
              />
            </Box>
          ))}
        </Box>
      </Box>

      {slides.length > 1 && (
        <>
          <IconButton
            type="button"
            onClick={scrollPrev}
            aria-label={t('heroBannerPrevious')}
            sx={{
              position: 'absolute',
              left: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              bgcolor: 'action.hover',
              color: 'text.primary',
              '&:hover': { bgcolor: 'action.selected' },
              boxShadow: 1,
              ...desktopNavSx,
            }}
            size="small"
          >
            <ChevronLeft />
          </IconButton>
          <IconButton
            type="button"
            onClick={scrollNext}
            aria-label={t('heroBannerNext')}
            sx={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              bgcolor: 'action.hover',
              color: 'text.primary',
              '&:hover': { bgcolor: 'action.selected' },
              boxShadow: 1,
              ...desktopNavSx,
            }}
            size="small"
          >
            <ChevronRight />
          </IconButton>
        </>
      )}

      {slides.length > 1 && (
        <Box
          sx={{
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.75,
            mt: 1.5,
            flexWrap: 'wrap',
            ...desktopDotsRowSx,
          }}
        >
          {scrollSnaps.map((_, i) => (
            <Box
              key={i}
              component="button"
              type="button"
              onClick={() => scrollTo(i)}
              aria-label={t('heroBannerGoToSlide', { n: i + 1 })}
              aria-current={i === selectedIndex ? 'true' : undefined}
              sx={{
                p: 0,
                minWidth: i === selectedIndex ? 28 : 20,
                height: 4,
                border: 'none',
                borderRadius: 1,
                cursor: 'pointer',
                bgcolor: i === selectedIndex ? 'primary.main' : 'action.disabledBackground',
                opacity: i === selectedIndex ? 1 : 0.6,
                transition: 'min-width 0.2s, opacity 0.2s, background-color 0.2s',
                '&:hover': { opacity: 1, bgcolor: i === selectedIndex ? 'primary.main' : 'action.hover' },
                '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
