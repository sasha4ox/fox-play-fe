'use client';

import { useState, useTransition, useDeferredValue, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import InputBase from '@mui/material/InputBase';
import Button from '@mui/material/Button';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useGames } from '@/hooks/useGames';
import SelectCard from '@/components/SelectCard/SelectCard';
import { getDirectOfferTarget, getGameImageCandidateUrls } from '@/lib/games';

const LETTERS = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];
const INITIAL_VISIBLE = 24;
const LOAD_MORE_COUNT = 24;

function filterGamesBySearch(games, searchQuery) {
  if (!searchQuery) return games;
  return games.filter((game) => {
    const gameName = String(game?.name ?? '').toLowerCase();
    if (gameName.includes(searchQuery)) return true;
    for (const v of game?.variants ?? []) {
      const variantName = String(v?.name ?? '').toLowerCase();
      if (variantName.includes(searchQuery)) return true;
      for (const s of v?.servers ?? []) {
        const serverName = String(s?.name ?? '').toLowerCase();
        if (serverName.includes(searchQuery)) return true;
      }
    }
    return false;
  });
}

function getLetterKey(name) {
  const first = String(name ?? '').trim().charAt(0).toUpperCase();
  if (!first) return '#';
  if (/[A-Z]/.test(first)) return first;
  if (/[0-9]/.test(first)) return '#';
  return '#';
}

export default function DashboardPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('Dashboard');
  const { games, loading, error } = useGames();
  const [search, setSearch] = useState('');
  const [isPending, startTransition] = useTransition();
  const deferredSearch = useDeferredValue(search);
  const [selectedLetter, setSelectedLetter] = useState(null);
  const [lettersOpen, setLettersOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const sentinelRef = useRef(null);

  const searchQuery = deferredSearch.trim().toLowerCase();
  const filteredBySearch = useMemo(() => filterGamesBySearch(games, searchQuery), [games, searchQuery]);
  // When user is searching, always show results from all games (ignore letter filter)
  const filteredGames = useMemo(
    () =>
      searchQuery
        ? filteredBySearch
        : selectedLetter
          ? filteredBySearch.filter((g) => getLetterKey(g.name) === selectedLetter)
          : filteredBySearch,
    [filteredBySearch, selectedLetter, searchQuery]
  );
  const gamesToShow = filteredGames.slice(0, visibleCount);
  const hasMore = visibleCount < filteredGames.length;

  const availableLetters = useMemo(() => {
    const set = new Set();
    for (const g of filteredBySearch) set.add(getLetterKey(g.name));
    return set;
  }, [filteredBySearch]);

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + LOAD_MORE_COUNT, filteredGames.length));
  }, [filteredGames.length]);

  useEffect(() => {
    if (!hasMore || !sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: '100px' }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE);
  }, [searchQuery, selectedLetter]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    startTransition(() => {
      setSearch(value);
      if (value.trim()) setSelectedLetter(null);
    });
  };

  const handleLetterClick = (letterOrNull) => {
    startTransition(() => {
      setSelectedLetter((prev) => (prev === letterOrNull ? null : letterOrNull));
      setLettersOpen(false);
    });
  };

  const handleGameClick = (game) => {
    const target = getDirectOfferTarget(game);
    if (target) {
      router.push(`/${locale}/game/${game.id}/${target.variantId}/${target.serverId}/offers`);
    } else {
      router.push(`/${locale}/game/${game.id}`);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        py: 4,
        px: 2,
      }}
    >
      <Container>
        <Typography variant="h4" fontWeight={600} color="text.primary" gutterBottom>
          {t('chooseGame')}
        </Typography>

        {!loading && games.length > 0 && (
          <Box sx={{ mt: 1, mb: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <InputBase
                placeholder={t('searchGames')}
                value={search}
                onChange={handleSearchChange}
                startAdornment={<SearchIcon sx={{ color: 'text.secondary', mr: 1.5, fontSize: 22 }} />}
                sx={{
                  width: '100%',
                  maxWidth: 400,
                  py: 1.25,
                  px: 2,
                  borderRadius: 2,
                  bgcolor: 'action.hover',
                  fontSize: '1rem',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              />
              {isPending && <CircularProgress size={20} sx={{ flexShrink: 0 }} />}
            </Box>
            {filteredBySearch.length > 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setLettersOpen((o) => !o)}
                  endIcon={
                    <ExpandMoreIcon
                      sx={{
                        transform: lettersOpen ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s',
                      }}
                    />
                  }
                  sx={{
                    display: { xs: 'flex', md: 'none' },
                    alignSelf: 'flex-start',
                    textTransform: 'none',
                    borderColor: 'divider',
                    color: selectedLetter ? 'primary.main' : 'text.secondary',
                  }}
                >
                  {t('filterByLetter')}
                  {selectedLetter && ` (${selectedLetter})`}
                </Button>
                <Box
                  sx={{
                    display: { xs: lettersOpen ? 'flex' : 'none', md: 'flex' },
                    flexWrap: 'wrap',
                    gap: 0.5,
                    alignItems: 'center',
                    py: 1,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  }}
                  role="navigation"
                  aria-label="Filter by letter"
                >
                <Box
                  component="button"
                  type="button"
                  onClick={() => handleLetterClick(null)}
                  aria-label="Show all games"
                  sx={{
                    minWidth: 36,
                    minHeight: 36,
                    px: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    borderRadius: 1,
                    bgcolor: 'transparent',
                    color: selectedLetter === null ? 'primary.main' : 'text.secondary',
                    fontSize: '0.875rem',
                    fontWeight: selectedLetter === null ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'color 0.15s, background 0.15s',
                    '&:hover': { bgcolor: 'action.hover', color: 'primary.main' },
                    '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
                    '&:active': { bgcolor: 'action.selected' },
                  }}
                >
                  All
                </Box>
                {LETTERS.map((letter) => {
                  const hasGames = availableLetters.has(letter);
                  const isSelected = selectedLetter === letter;
                  return (
                    <Box
                      key={letter}
                      component="button"
                      type="button"
                      onClick={() => hasGames && handleLetterClick(letter)}
                      disabled={!hasGames}
                      aria-label={hasGames ? `Filter to ${letter}` : `${letter} (no games)`}
                      sx={{
                        minWidth: 36,
                        minHeight: 36,
                        px: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: 'none',
                        borderRadius: 1,
                        bgcolor: 'transparent',
                        color: hasGames ? (isSelected ? 'primary.main' : 'text.secondary') : 'action.disabled',
                        fontSize: '0.875rem',
                        fontWeight: isSelected ? 700 : 500,
                        cursor: hasGames ? 'pointer' : 'default',
                        transition: 'color 0.15s, background 0.15s',
                        '&:hover': hasGames ? { bgcolor: 'action.hover', color: 'primary.main' } : {},
                        '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
                        '&:active': hasGames ? { bgcolor: 'action.selected' } : {},
                      }}
                    >
                      {letter}
                    </Box>
                  );
                })}
                </Box>
              </Box>
            )}
          </Box>
        )}

        {loading && (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2, mt: 2 }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} variant="outlined" sx={{ overflow: 'hidden', borderRadius: 2 }}>
                <Skeleton variant="rectangular" height={160} />
                <CardContent sx={{ py: 1.5, textAlign: 'center' }}>
                  <Skeleton variant="text" width="60%" height={28} sx={{ mx: 'auto' }} />
                </CardContent>
              </Card>
            ))}
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && games.length > 0 && filteredGames.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                gap: 2,
              }}
            >
              {gamesToShow.map((game) => {
                const imageUrl = getGameImageCandidateUrls(game);
                return (
                  <SelectCard
                    key={game.id}
                    name={game.name}
                    imageUrl={imageUrl}
                    onClick={() => handleGameClick(game)}
                  />
                );
              })}
            </Box>
            {hasMore && <Box ref={sentinelRef} sx={{ height: 1, mt: 2 }} aria-hidden="true" />}
          </Box>
        )}

        {!loading && !error && games.length === 0 && (
          <Typography color="text.secondary" sx={{ mt: 2 }}>
            {t('noGames')}
          </Typography>
        )}

        {!loading && !error && games.length > 0 && filteredGames.length === 0 && (
          <Typography color="text.secondary" sx={{ mt: 2 }}>
            {t('noSearchResults')}
          </Typography>
        )}
      </Container>
    </Box>
  );
}
