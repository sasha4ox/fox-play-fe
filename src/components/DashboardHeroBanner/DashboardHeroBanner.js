'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import Image from 'next/image';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import Pause from '@mui/icons-material/Pause';
import PlayArrow from '@mui/icons-material/PlayArrow';
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

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState([]);
  const [autoplayPlaying, setAutoplayPlaying] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  const onSelect = useCallback((api) => {
    setSelectedIndex(api.selectedScrollSnap());
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => {
      const reduced = mq.matches;
      setReducedMotion(reduced);
      if (reduced && emblaApi) {
        emblaApi.plugins().autoplay?.stop();
        setAutoplayPlaying(false);
      }
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect(emblaApi);
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      emblaApi.plugins().autoplay?.stop();
      setAutoplayPlaying(false);
    }

    const onAutoplayPlay = () => setAutoplayPlaying(true);
    const onAutoplayStop = () => setAutoplayPlaying(false);
    emblaApi.on('autoplay:play', onAutoplayPlay);
    emblaApi.on('autoplay:stop', onAutoplayStop);

    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
      emblaApi.off('autoplay:play', onAutoplayPlay);
      emblaApi.off('autoplay:stop', onAutoplayStop);
    };
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((i) => emblaApi?.scrollTo(i), [emblaApi]);

  const toggleAutoplay = useCallback(() => {
    if (!emblaApi || reducedMotion) return;
    const plugin = emblaApi.plugins().autoplay;
    if (!plugin) return;
    if (plugin.isPlaying()) {
      plugin.stop();
    } else {
      plugin.play();
    }
  }, [emblaApi, reducedMotion]);

  if (!slides.length) {
    return null;
  }

  return (
    <Box
      component="section"
      aria-roledescription="carousel"
      aria-label={t('heroBannerCarouselLabel')}
      sx={{ position: 'relative', mb: 3 }}
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
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            mt: 1.5,
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
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
          {!reducedMotion && (
            <IconButton
              type="button"
              onClick={toggleAutoplay}
              aria-label={autoplayPlaying ? t('heroBannerPause') : t('heroBannerPlay')}
              size="small"
              sx={{ color: 'text.secondary' }}
            >
              {autoplayPlaying ? <Pause fontSize="small" /> : <PlayArrow fontSize="small" />}
            </IconButton>
          )}
        </Box>
      )}

    </Box>
  );
}
