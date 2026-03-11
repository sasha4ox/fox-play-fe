'use client';

import { useState, useEffect, useTransition } from 'react';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Switch from '@mui/material/Switch';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import ImageIcon from '@mui/icons-material/Image';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { useAuthStore } from '@/store/authStore';
import {
  getAdminGame,
  adminUpdateGame,
  adminUpdateVariant,
  adminUpdateServer,
  adminCreateVariant,
  adminCreateServer,
  adminCreateServerCustomCategory,
  adminDeleteServerCustomCategory,
} from '@/lib/api';

const STANDARD_OFFER_TYPES = ['ADENA', 'ITEMS', 'ACCOUNTS', 'BOOSTING', 'OTHER'];

export default function AdminGameEditPage() {
  const t = useTranslations('Admin');
  const token = useAuthStore((s) => s.token);
  const router = useRouter();
  const locale = useLocale();
  const params = useParams();
  const gameId = params?.gameId ?? null;

  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [expandedVariant, setExpandedVariant] = useState(null);
  const [addVariantOpen, setAddVariantOpen] = useState(false);
  const [addVariantName, setAddVariantName] = useState('');
  const [addServerOpen, setAddServerOpen] = useState(null);
  const [addServerName, setAddServerName] = useState('');
  const [addCategoryOpen, setAddCategoryOpen] = useState(null);
  const [addCategoryName, setAddCategoryName] = useState('');
  const [editServerId, setEditServerId] = useState(null);
  const [editServerName, setEditServerName] = useState('');
  const [editGameImageOpen, setEditGameImageOpen] = useState(false);
  const [editGameImageUrl, setEditGameImageUrl] = useState('');
  const [, startTransition] = useTransition();

  const isSimple = (g) => g?.structureType === 'SIMPLE';
  const isVariantOnly = (g) => g?.structureType === 'VARIANT_ONLY';

  const load = () => {
    if (!token || !gameId) return;
    setLoading(true);
    setError(null);
    getAdminGame(token, gameId)
      .then((r) => setGame(r.game ?? null))
      .catch((e) => setError(e.message || 'Failed to load game'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [token, gameId]);

  const handleGameEnabled = (id, enabled) => {
    if (!token) return;
    setSubmitting(true);
    adminUpdateGame(id, { enabled }, token)
      .then(load)
      .catch((e) => setError(e.message || 'Failed to update'))
      .finally(() => setSubmitting(false));
  };

  const handleGameTop = (id, isTop) => {
    if (!token) return;
    setSubmitting(true);
    adminUpdateGame(id, { isTop }, token)
      .then(load)
      .catch((e) => setError(e.message || 'Failed to update'))
      .finally(() => setSubmitting(false));
  };

  const handleGameStructureType = (id, structureType) => {
    if (!token) return;
    setSubmitting(true);
    adminUpdateGame(id, { structureType }, token)
      .then(load)
      .catch((e) => setError(e.message || 'Failed to update'))
      .finally(() => setSubmitting(false));
  };

  const handleGameAdenaPriceUnit = (id, adenaPriceUnitKk) => {
    if (!token) return;
    const n = Number(adenaPriceUnitKk);
    if (!Number.isInteger(n) || n < 1 || n > 1000) return;
    setSubmitting(true);
    adminUpdateGame(id, { adenaPriceUnitKk: n }, token)
      .then(load)
      .catch((e) => setError(e.message || 'Failed to update'))
      .finally(() => setSubmitting(false));
  };

  const handleServerOfferTypes = (serverId, enabledOfferTypes) => {
    if (!token) return;
    setSubmitting(true);
    adminUpdateServer(serverId, { enabledOfferTypes }, token)
      .then(load)
      .catch((e) => setError(e.message || 'Failed to update'))
      .finally(() => setSubmitting(false));
  };

  const handleVariantEnabled = (variantId, enabled) => {
    if (!token) return;
    setSubmitting(true);
    adminUpdateVariant(variantId, { enabled }, token)
      .then(load)
      .catch((e) => setError(e.message || 'Failed to update'))
      .finally(() => setSubmitting(false));
  };

  const handleVariantTop = (variantId, isTop) => {
    if (!token) return;
    setSubmitting(true);
    adminUpdateVariant(variantId, { isTop }, token)
      .then(load)
      .catch((e) => setError(e.message || 'Failed to update'))
      .finally(() => setSubmitting(false));
  };

  const handleServerEnabled = (serverId, enabled) => {
    if (!token) return;
    setSubmitting(true);
    adminUpdateServer(serverId, { enabled }, token)
      .then(load)
      .catch((e) => setError(e.message || 'Failed to update'))
      .finally(() => setSubmitting(false));
  };

  const handleServerTop = (serverId, isTop) => {
    if (!token) return;
    setSubmitting(true);
    adminUpdateServer(serverId, { isTop }, token)
      .then(load)
      .catch((e) => setError(e.message || 'Failed to update'))
      .finally(() => setSubmitting(false));
  };

  const handleServerNameChange = (serverId, newName) => {
    if (!token || !newName?.trim()) return;
    setSubmitting(true);
    adminUpdateServer(serverId, { name: newName.trim() }, token)
      .then(() => {
        setEditServerId(null);
        setEditServerName('');
        load();
      })
      .catch((e) => setError(e.message || 'Failed to update server name'))
      .finally(() => setSubmitting(false));
  };

  const handleServerAdenaPriceUnit = (serverId, adenaPriceUnitKk) => {
    if (!token) return;
    const value = adenaPriceUnitKk === '__inherit__' || adenaPriceUnitKk === null ? null : Number(adenaPriceUnitKk);
    if (value !== null && (!Number.isInteger(value) || value < 1 || value > 1000)) return;
    setSubmitting(true);
    adminUpdateServer(serverId, { adenaPriceUnitKk: value }, token)
      .then(load)
      .catch((e) => setError(e.message || 'Failed to update adena price unit'))
      .finally(() => setSubmitting(false));
  };

  const handleAddVariant = () => {
    if (!token || !gameId || !addVariantName.trim()) return;
    setSubmitting(true);
    adminCreateVariant(gameId, { name: addVariantName.trim() }, token)
      .then(() => {
        setAddVariantOpen(false);
        setAddVariantName('');
        load();
      })
      .catch((e) => setError(e.message || 'Failed to create variant'))
      .finally(() => setSubmitting(false));
  };

  const handleAddServer = () => {
    const { variantId } = addServerOpen || {};
    if (!token || !gameId || !variantId || !addServerName.trim()) return;
    setSubmitting(true);
    adminCreateServer(gameId, variantId, { name: addServerName.trim() }, token)
      .then(() => {
        setAddServerOpen(null);
        setAddServerName('');
        load();
      })
      .catch((e) => setError(e.message || 'Failed to create server'))
      .finally(() => setSubmitting(false));
  };

  const handleAddCustomCategory = () => {
    const serverId = addCategoryOpen;
    if (!token || !serverId || !addCategoryName.trim()) return;
    setSubmitting(true);
    adminCreateServerCustomCategory(serverId, { name: addCategoryName.trim() }, token)
      .then(() => {
        setAddCategoryOpen(null);
        setAddCategoryName('');
        load();
      })
      .catch((e) => setError(e.message || 'Failed to create category'))
      .finally(() => setSubmitting(false));
  };

  const handleDeleteCustomCategory = (id) => {
    if (!token) return;
    setSubmitting(true);
    adminDeleteServerCustomCategory(id, token)
      .then(load)
      .catch((e) => setError(e.message || 'Failed to delete category'))
      .finally(() => setSubmitting(false));
  };

  const handleOpenEditGameImage = () => {
    setEditGameImageUrl(game?.imageUrl ?? '');
    setEditGameImageOpen(true);
  };

  const handleSaveGameImage = () => {
    if (!token || !game) return;
    setSubmitting(true);
    adminUpdateGame(game.id, { imageUrl: editGameImageUrl.trim() || null }, token)
      .then(() => {
        setEditGameImageOpen(false);
        load();
      })
      .catch((e) => setError(e.message || 'Failed to update image'))
      .finally(() => setSubmitting(false));
  };

  const getCategoryLabel = (typeOrId, server) => {
    if (STANDARD_OFFER_TYPES.includes(typeOrId)) {
      return t(`offerType${typeOrId.charAt(0) + typeOrId.slice(1).toLowerCase()}`);
    }
    const custom = server?.customCategories?.find((c) => c.id === typeOrId);
    return custom?.name ?? typeOrId;
  };

  const getAllCategoriesForServer = (server) => {
    const standard = STANDARD_OFFER_TYPES.map((id) => ({ id, name: id }));
    const custom = (server?.customCategories ?? []).map((c) => ({ id: c.id, name: c.name }));
    return [...standard, ...custom];
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Skeleton variant="rounded" height={400} sx={{ borderRadius: 2 }} />
      </Container>
    );
  }

  if (!gameId || !game) {
    return (
      <Container maxWidth="lg">
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t('gameNotFound')}
        </Alert>
        <Button component={Link} href={`/${locale}/dashboard/admin/games`}>
          {t('backToGamesList')}
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton
          component={Link}
          href={`/${locale}/dashboard/admin/games`}
          aria-label={t('backToGamesList')}
          sx={{ color: 'text.primary' }}
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" fontWeight={600}>
          {game.name}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card variant="outlined" sx={{ overflow: 'hidden', borderRadius: 2, mb: 3 }}>
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" fontWeight={600}>
              {game.name}
            </Typography>
            <IconButton
              size="small"
              onClick={handleOpenEditGameImage}
              title={t('editGameImage')}
              disabled={submitting}
              sx={{ color: 'text.secondary', minHeight: 44, minWidth: 44 }}
            >
              <ImageIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
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
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>{t('adenaPriceUnitKk')}</InputLabel>
              <Select
                value={String(game.adenaPriceUnitKk ?? 100)}
                label={t('adenaPriceUnitKk')}
                onChange={(e) => handleGameAdenaPriceUnit(game.id, Number(e.target.value))}
                disabled={submitting}
                sx={{ bgcolor: 'background.paper' }}
              >
                <MenuItem value="1">1 kk</MenuItem>
                <MenuItem value="10">10 kk</MenuItem>
                <MenuItem value="100">100 kk</MenuItem>
                <MenuItem value="1000">1000 kk</MenuItem>
              </Select>
            </FormControl>
            {!isSimple(game) && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setAddVariantOpen(true)}
                disabled={submitting}
              >
                {t('addVariant')}
              </Button>
            )}
          </Box>
        </Box>
      </Card>

      {(game.variants || []).length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {(game.variants || []).map((variant) => {
            const isAllTypes = (s) => !s.enabledOfferTypes || s.enabledOfferTypes.length === 0;
            const selectedTypes = (s) => isAllTypes(s) ? [] : [...(s.enabledOfferTypes || [])];
            const allCats = (s) => getAllCategoriesForServer(s);
            return (
              <Card key={variant.id} variant="outlined" sx={{ borderRadius: 1.5 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 1.5,
                    bgcolor: 'action.hover',
                    borderRadius: '4px 4px 0 0',
                  }}
                >
                  <Typography variant="subtitle2" fontWeight={600}>
                    {variant.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={variant.enabled}
                          onChange={(e) => handleVariantEnabled(variant.id, e.target.checked)}
                          disabled={submitting}
                        />
                      }
                      label={t('enabled')}
                      sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.8rem' } }}
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={variant.isTop ?? false}
                          onChange={(e) => handleVariantTop(variant.id, e.target.checked)}
                          disabled={submitting}
                        />
                      }
                      label={t('top')}
                      title={t('topHint')}
                      sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.8rem' } }}
                    />
                    {!isVariantOnly(game) && (
                      <IconButton
                        size="small"
                        onClick={() => setAddServerOpen({ gameId: game.id, variantId: variant.id })}
                        title={t('addServer')}
                        disabled={submitting}
                        sx={{ minHeight: 44, minWidth: 44 }}
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                    )}
                    <IconButton
                      size="small"
                      onClick={() =>
                        startTransition(() =>
                          setExpandedVariant(expandedVariant === variant.id ? null : variant.id)
                        )
                      }
                      sx={{ minHeight: 44, minWidth: 44 }}
                    >
                      {expandedVariant === variant.id ? (
                        <ExpandLessIcon fontSize="small" />
                      ) : (
                        <ExpandMoreIcon fontSize="small" />
                      )}
                    </IconButton>
                  </Box>
                </Box>
                <Collapse in={expandedVariant === variant.id}>
                  <List dense disablePadding>
                    {(variant.servers || []).map((server) => {
                      const isAll = isAllTypes(server);
                      const selected = selectedTypes(server);
                      const allCatsForServer = allCats(server);
                      return (
                        <ListItem
                          key={server.id}
                          sx={{
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                            '&:last-child': { borderBottom: 'none' },
                            py: 1.5,
                          }}
                        >
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                {editServerId === server.id ? (
                                  <TextField
                                    size="small"
                                    value={editServerName}
                                    onChange={(e) => setEditServerName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleServerNameChange(server.id, editServerName);
                                      if (e.key === 'Escape') {
                                        setEditServerId(null);
                                        setEditServerName('');
                                      }
                                    }}
                                    onBlur={() => {
                                      if (editServerName.trim() && editServerName.trim() !== server.name) {
                                        handleServerNameChange(server.id, editServerName);
                                      } else {
                                        setEditServerId(null);
                                        setEditServerName('');
                                      }
                                    }}
                                    autoFocus
                                    sx={{ minWidth: 140, '& .MuiInputBase-input': { py: 0.5 } }}
                                  />
                                ) : (
                                  <>
                                    <span>{server.name}</span>
                                    <IconButton
                                      size="small"
                                      onClick={() => {
                                        setEditServerId(server.id);
                                        setEditServerName(server.name);
                                      }}
                                      title={t('editServerName')}
                                      disabled={submitting}
                                      sx={{ color: 'text.secondary', p: 0.25, minHeight: 44, minWidth: 44 }}
                                    >
                                      <EditIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                  </>
                                )}
                                {editServerId !== server.id && (
                                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {(server.customCategories ?? []).map((cat) => (
                                      <Chip
                                        key={cat.id}
                                        label={cat.name}
                                        size="small"
                                        onDelete={() => handleDeleteCustomCategory(cat.id)}
                                        disabled={submitting}
                                        sx={{ height: 22, fontSize: '0.7rem' }}
                                      />
                                    ))}
                                    <Chip
                                      icon={<AddIcon sx={{ fontSize: 14 }} />}
                                      label={t('addCustomCategory')}
                                      size="small"
                                      variant="outlined"
                                      onClick={() => setAddCategoryOpen(server.id)}
                                      disabled={submitting}
                                      sx={{ height: 22, fontSize: '0.7rem' }}
                                    />
                                  </Box>
                                )}
                              </Box>
                            }
                            primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                          />
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                            <FormControl size="small" sx={{ minWidth: 120 }}>
                              <InputLabel>{t('adenaPriceUnitKk')}</InputLabel>
                              <Select
                                value={server.adenaPriceUnitKk != null ? String(server.adenaPriceUnitKk) : '__inherit__'}
                                label={t('adenaPriceUnitKk')}
                                onChange={(e) => handleServerAdenaPriceUnit(server.id, e.target.value)}
                                disabled={submitting}
                                sx={{ height: 36, minWidth: 120 }}
                              >
                                <MenuItem value="__inherit__">
                                  {t('inherit')} ({game?.adenaPriceUnitKk ?? 100} kk)
                                </MenuItem>
                                <MenuItem value="1">1 kk</MenuItem>
                                <MenuItem value="10">10 kk</MenuItem>
                                <MenuItem value="100">100 kk</MenuItem>
                                <MenuItem value="1000">1000 kk</MenuItem>
                              </Select>
                            </FormControl>
                            <FormControl size="small" sx={{ minWidth: 130 }}>
                              <InputLabel>{t('offerCategories')}</InputLabel>
                              <Select
                                value={isAll ? '__ALL__' : '__CUSTOM__'}
                                label={t('offerCategories')}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  handleServerOfferTypes(
                                    server.id,
                                    v === '__ALL__' ? null : selected.length ? selected : allCatsForServer.map((c) => c.id)
                                  );
                                }}
                                disabled={submitting}
                                sx={{ height: 36 }}
                              >
                                <MenuItem value="__ALL__">{t('offerCategoriesAll')}</MenuItem>
                                <MenuItem value="__CUSTOM__">{t('offerCategoriesCustom')}</MenuItem>
                              </Select>
                            </FormControl>
                            {!isAll && (
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {allCatsForServer.map(({ id }) => (
                                  <Chip
                                    key={id}
                                    label={getCategoryLabel(id, server)}
                                    size="small"
                                    color={selected.includes(id) ? 'primary' : 'default'}
                                    variant={selected.includes(id) ? 'filled' : 'outlined'}
                                    onClick={() => {
                                      const next = selected.includes(id)
                                        ? selected.filter((x) => x !== id)
                                        : [...selected, id];
                                      handleServerOfferTypes(server.id, next.length ? next : null);
                                    }}
                                    disabled={submitting}
                                    sx={{ height: 28 }}
                                  />
                                ))}
                              </Box>
                            )}
                            <FormControlLabel
                              control={
                                <Switch
                                  size="small"
                                  checked={server.enabled}
                                  onChange={(e) => handleServerEnabled(server.id, e.target.checked)}
                                  disabled={submitting}
                                />
                              }
                              label={t('enabled')}
                              sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.75rem' } }}
                            />
                            <FormControlLabel
                              control={
                                <Switch
                                  size="small"
                                  checked={server.isTop ?? false}
                                  onChange={(e) => handleServerTop(server.id, e.target.checked)}
                                  disabled={submitting}
                                />
                              }
                              label={t('top')}
                              title={t('topHint')}
                              sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.75rem' } }}
                            />
                          </Box>
                        </ListItem>
                      );
                    })}
                  </List>
                </Collapse>
              </Card>
            );
          })}
        </Box>
      )}

      <Dialog open={editGameImageOpen} onClose={() => !submitting && setEditGameImageOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('editGameImage')} — {game?.name}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            autoFocus
            margin="dense"
            label={t('gameImageUrl')}
            placeholder="/images/games/lineage-2.png"
            fullWidth
            value={editGameImageUrl}
            onChange={(e) => setEditGameImageUrl(e.target.value)}
            helperText={t('gameImageUrlHint')}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveGameImage()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditGameImageOpen(false)} disabled={submitting}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSaveGameImage} variant="contained" disabled={submitting}>
            {t('save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={addVariantOpen} onClose={() => !submitting && setAddVariantOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('addVariant')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={t('variantName')}
            fullWidth
            value={addVariantName}
            onChange={(e) => setAddVariantName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddVariant()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddVariantOpen(false)} disabled={submitting}>
            {t('cancel')}
          </Button>
          <Button onClick={handleAddVariant} variant="contained" disabled={submitting || !addVariantName.trim()}>
            {t('add')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!addServerOpen} onClose={() => !submitting && setAddServerOpen(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('addServer')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={t('serverName')}
            fullWidth
            value={addServerName}
            onChange={(e) => setAddServerName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddServer()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddServerOpen(null)} disabled={submitting}>
            {t('cancel')}
          </Button>
          <Button onClick={handleAddServer} variant="contained" disabled={submitting || !addServerName.trim()}>
            {t('add')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!addCategoryOpen} onClose={() => !submitting && setAddCategoryOpen(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('addCustomCategory')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={t('customCategoryName')}
            fullWidth
            placeholder="e.g. Skins, Coins"
            value={addCategoryName}
            onChange={(e) => setAddCategoryName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCustomCategory()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddCategoryOpen(null)} disabled={submitting}>
            {t('cancel')}
          </Button>
          <Button
            onClick={handleAddCustomCategory}
            variant="contained"
            disabled={submitting || !addCategoryName.trim()}
          >
            {t('add')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
