'use client';

import { useState, useEffect, useMemo, useDeferredValue, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Switch from '@mui/material/Switch';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import InputBase from '@mui/material/InputBase';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Card from '@mui/material/Card';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import Skeleton from '@mui/material/Skeleton';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { useAuthStore } from '@/store/authStore';
import {
  getAdminGames,
  adminUpdateGame,
  adminCreateGame,
} from '@/lib/api';
const GAMES_PER_PAGE = 15;
const LETTERS = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

function getLetterKey(name) {
  const first = String(name ?? '').trim().charAt(0).toUpperCase();
  if (!first) return '#';
  if (/[A-Z]/.test(first)) return first;
  if (/[0-9]/.test(first)) return '#';
  return '#';
}

function filterAdminGamesBySearch(games, searchQuery) {
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

export default function AdminGamesPage() {
  const t = useTranslations('Admin');
  const token = useAuthStore((s) => s.token);
  const router = useRouter();
  const locale = useLocale();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addGameOpen, setAddGameOpen] = useState(false);
  const [addGameName, setAddGameName] = useState('');
  const [addGameStructureType, setAddGameStructureType] = useState('FULL');
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedLetter, setSelectedLetter] = useState(null);
  const [lettersOpen, setLettersOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const deferredSearch = useDeferredValue(search);
  const searchQuery = deferredSearch.trim().toLowerCase();
  const filteredBySearch = useMemo(
    () => filterAdminGamesBySearch(games, searchQuery),
    [games, searchQuery]
  );
  const filteredGames = useMemo(
    () =>
      searchQuery
        ? filteredBySearch
        : selectedLetter
          ? filteredBySearch.filter((g) => getLetterKey(g.name) === selectedLetter)
          : filteredBySearch,
    [filteredBySearch, selectedLetter, searchQuery]
  );
  const availableLetters = useMemo(() => {
    const set = new Set();
    for (const g of filteredBySearch) set.add(getLetterKey(g.name));
    return set;
  }, [filteredBySearch]);
  const [visibleCount, setVisibleCount] = useState(GAMES_PER_PAGE);
  const loadMoreRef = useRef(null);

  // Reset visible count when search, letter filter, or list changes
  useEffect(() => {
    setVisibleCount(GAMES_PER_PAGE);
  }, [searchQuery, selectedLetter, games]);

  // Load more when sentinel enters viewport
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || filteredGames.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          setVisibleCount((prev) =>
            Math.min(prev + GAMES_PER_PAGE, filteredGames.length)
          );
        }
      },
      { rootMargin: '200px', threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredGames.length, visibleCount]);


  const visibleGames = useMemo(
    () => filteredGames.slice(0, visibleCount),
    [filteredGames, visibleCount]
  );
  const hasMore = visibleCount < filteredGames.length;

  const load = () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    getAdminGames(token)
      .then((r) => setGames(r.games ?? []))
      .catch((e) => setError(e.message || 'Failed to load games'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [token]);

  const handleGameEnabled = (gameId, enabled) => {
    if (!token) return;
    setSubmitting(true);
    adminUpdateGame(gameId, { enabled }, token)
      .then(load)
      .catch((e) => setError(e.message || 'Failed to update'))
      .finally(() => setSubmitting(false));
  };

  const handleGameTop = (gameId, isTop) => {
    if (!token) return;
    setSubmitting(true);
    adminUpdateGame(gameId, { isTop }, token)
      .then(load)
      .catch((e) => setError(e.message || 'Failed to update'))
      .finally(() => setSubmitting(false));
  };

  const handleGameStructureType = (gameId, structureType) => {
    if (!token) return;
    setSubmitting(true);
    adminUpdateGame(gameId, { structureType }, token)
      .then(load)
      .catch((e) => setError(e.message || 'Failed to update'))
      .finally(() => setSubmitting(false));
  };

  const handleGameAdenaPriceUnit = (gameId, adenaPriceUnitKk) => {
    if (!token) return;
    const n = Number(adenaPriceUnitKk);
    if (!Number.isInteger(n) || n < 0 || n > 1000) return;
    setSubmitting(true);
    adminUpdateGame(gameId, { adenaPriceUnitKk: n }, token)
      .then(load)
      .catch((e) => setError(e.message || 'Failed to update'))
      .finally(() => setSubmitting(false));
  };

  const handleAddGame = () => {
    if (!token || !addGameName.trim()) return;
    setSubmitting(true);
    adminCreateGame({ name: addGameName.trim(), structureType: addGameStructureType }, token)
      .then(() => {
        setAddGameOpen(false);
        setAddGameName('');
        setAddGameStructureType('FULL');
        load();
      })
      .catch((e) => setError(e.message || 'Failed to create game'))
      .finally(() => setSubmitting(false));
  };

  const handleLetterClick = (letterOrNull) => {
    startTransition(() => {
      setSelectedLetter((prev) => (prev === letterOrNull ? null : letterOrNull));
      setLettersOpen(false);
    });
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" fontWeight={600}>
          {t('games')}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', width: { xs: '100%', sm: 'auto' } }}>
          <InputBase
            placeholder={t('searchGames')}
            value={search}
            onChange={(e) => {
              const value = e.target.value;
              startTransition(() => {
                setSearch(value);
                if (value.trim()) setSelectedLetter(null);
              });
            }}
            startAdornment={
              <>
                <SearchIcon sx={{ color: 'text.secondary', mr: 1.5, fontSize: 20 }} />
                {isPending && <CircularProgress size={20} sx={{ mr: 1, flexShrink: 0 }} />}
              </>
            }
            sx={{
              minWidth: { xs: '100%', sm: 240 },
              flex: { xs: 1, sm: 'none' },
              py: 1,
              px: 2,
              borderRadius: 1,
              bgcolor: 'action.hover',
              fontSize: '0.95rem',
              border: '1px solid',
              borderColor: 'divider',
            }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddGameOpen(true)}
            disabled={loading}
            sx={{ minHeight: 44 }}
          >
            {t('addGame')}
          </Button>
        </Box>
      </Box>
      {!loading && games.length > 0 && filteredBySearch.length > 0 && (
        <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setLettersOpen((o) => !o)}
            endIcon={
              <ExpandMoreIcon sx={{ transform: lettersOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
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
            aria-label={t('filterByLetter')}
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
              {t('all')}
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
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {loading ? (
        <Skeleton variant="rounded" height={400} sx={{ borderRadius: 2 }} />
      ) : games.length === 0 ? (
        <Card variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">{t('noGames')}</Typography>
        </Card>
      ) : filteredGames.length === 0 ? (
        <Card variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">{t('noSearchResults')}</Typography>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {isPending && (
            <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', opacity: 0.8 }}>
              …
            </Typography>
          )}
          {visibleGames.map((game) => (
            <Card key={game.id} variant="outlined" sx={{ overflow: 'hidden', borderRadius: 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 2,
                  bgcolor: 'action.hover',
                  flexWrap: 'wrap',
                  gap: 2,
                }}
              >
                <Typography variant="h6" fontWeight={600}>
                  {game.name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', width: { xs: '100%', sm: 'auto' } }}>
                  <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 200 } }} fullWidth>
                    <InputLabel>{t('structureType')}</InputLabel>
                    <Select
                      value={game.structureType ?? 'FULL'}
                      label={t('structureType')}
                      onChange={(e) => handleGameStructureType(game.id, e.target.value)}
                      disabled={submitting}
                      sx={{ bgcolor: 'background.paper' }}
                    >
                      <MenuItem value="SIMPLE">{t('structureSimple')}</MenuItem>
                      <MenuItem value="VARIANT_ONLY">{t('structureVariantOnly')}</MenuItem>
                      <MenuItem value="FULL">{t('structureFull')}</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={game.enabled}
                        onChange={(e) => handleGameEnabled(game.id, e.target.checked)}
                        disabled={submitting}
                        color="primary"
                      />
                    }
                    label={t('enabled')}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={game.isTop ?? false}
                        onChange={(e) => handleGameTop(game.id, e.target.checked)}
                        disabled={submitting}
                        color="primary"
                      />
                    }
                    label={t('top')}
                    title={t('topHint')}
                  />
                  <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 140 } }}>
                    <InputLabel>{t('adenaPriceUnitKk')}</InputLabel>
                    <Select
                      value={String(game.adenaPriceUnitKk != null ? game.adenaPriceUnitKk : 100)}
                      label={t('adenaPriceUnitKk')}
                      onChange={(e) => handleGameAdenaPriceUnit(game.id, Number(e.target.value))}
                      disabled={submitting}
                      sx={{ bgcolor: 'background.paper' }}
                    >
                      <MenuItem value="0">1 k</MenuItem>
                      <MenuItem value="1">1 kk</MenuItem>
                      <MenuItem value="10">10 kk</MenuItem>
                      <MenuItem value="100">100 kk</MenuItem>
                      <MenuItem value="1000">1000 kk</MenuItem>
                    </Select>
                  </FormControl>
                  <Button
                    variant="outlined"
                    size="small"
                    endIcon={<ArrowForwardIcon />}
                    onClick={() => router.push(`/${locale}/dashboard/admin/games/${game.id}`)}
                    sx={{ minHeight: 44 }}
                  >
                    {t('editGame')}
                  </Button>
                </Box>
              </Box>
            </Card>
          ))}
          {hasMore && (
            <Box
              ref={loadMoreRef}
              sx={{
                minHeight: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                py: 2,
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {visibleGames.length} / {filteredGames.length}
              </Typography>
            </Box>
          )}
        </Box>
      )}

      <Dialog open={addGameOpen} onClose={() => !submitting && setAddGameOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('addGame')}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            autoFocus
            margin="dense"
            label={t('gameName')}
            fullWidth
            value={addGameName}
            onChange={(e) => setAddGameName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddGame()}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>{t('structureType')}</InputLabel>
            <Select
              value={addGameStructureType}
              label={t('structureType')}
              onChange={(e) => setAddGameStructureType(e.target.value)}
            >
              <MenuItem value="SIMPLE">{t('structureSimple')}</MenuItem>
              <MenuItem value="VARIANT_ONLY">{t('structureVariantOnly')}</MenuItem>
              <MenuItem value="FULL">{t('structureFull')}</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddGameOpen(false)} disabled={submitting}>
            {t('cancel')}
          </Button>
          <Button onClick={handleAddGame} variant="contained" disabled={submitting || !addGameName.trim()}>
            {t('add')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
