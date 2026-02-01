'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { useAuthStore } from '@/store/authStore';
import {
  getAdminGames,
  adminUpdateGame,
  adminUpdateVariant,
  adminUpdateServer,
  adminCreateGame,
  adminCreateVariant,
  adminCreateServer,
} from '@/lib/api';

export default function AdminGamesPage() {
  const t = useTranslations('Admin');
  const token = useAuthStore((s) => s.token);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedGame, setExpandedGame] = useState(null);
  const [expandedVariant, setExpandedVariant] = useState(null);
  const [addGameOpen, setAddGameOpen] = useState(false);
  const [addGameName, setAddGameName] = useState('');
  const [addVariantOpen, setAddVariantOpen] = useState(null);
  const [addVariantName, setAddVariantName] = useState('');
  const [addServerOpen, setAddServerOpen] = useState(null);
  const [addServerName, setAddServerName] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const handleVariantEnabled = (variantId, enabled) => {
    if (!token) return;
    setSubmitting(true);
    adminUpdateVariant(variantId, { enabled }, token)
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

  const handleAddGame = () => {
    if (!token || !addGameName.trim()) return;
    setSubmitting(true);
    adminCreateGame({ name: addGameName.trim() }, token)
      .then(() => {
        setAddGameOpen(false);
        setAddGameName('');
        load();
      })
      .catch((e) => setError(e.message || 'Failed to create game'))
      .finally(() => setSubmitting(false));
  };

  const handleAddVariant = () => {
    const gameId = addVariantOpen;
    if (!token || !gameId || !addVariantName.trim()) return;
    setSubmitting(true);
    adminCreateVariant(gameId, { name: addVariantName.trim() }, token)
      .then(() => {
        setAddVariantOpen(null);
        setAddVariantName('');
        load();
      })
      .catch((e) => setError(e.message || 'Failed to create variant'))
      .finally(() => setSubmitting(false));
  };

  const handleAddServer = () => {
    const { gameId, variantId } = addServerOpen || {};
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

  return (
    <Container maxWidth="md">
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h5">{t('games')}</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddGameOpen(true)} disabled={loading}>
          {t('addGame')}
        </Button>
      </Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {loading ? (
        <Skeleton variant="rectangular" height={300} />
      ) : (
        <List disablePadding>
          {games.length === 0 ? (
            <Typography color="text.secondary">{t('noGames')}</Typography>
          ) : (
            games.map((game) => (
              <Box key={game.id}>
                <ListItem
                  sx={{ bgcolor: 'action.hover', borderRadius: 1, mb: 0.5 }}
                  secondaryAction={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={game.enabled}
                            onChange={(e) => handleGameEnabled(game.id, e.target.checked)}
                            disabled={submitting}
                          />
                        }
                        label={t('enabled')}
                        labelPlacement="start"
                      />
                      <IconButton
                        size="small"
                        onClick={() => setAddVariantOpen(game.id)}
                        title={t('addVariant')}
                        disabled={submitting}
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => setExpandedGame(expandedGame === game.id ? null : game.id)}
                      >
                        {expandedGame === game.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </Box>
                  }
                >
                  <ListItemText primary={game.name} primaryTypographyProps={{ fontWeight: 600 }} />
                </ListItem>
                <Collapse in={expandedGame === game.id} timeout="auto" unmountOnExit>
                  <List disablePadding sx={{ pl: 2 }}>
                    {(game.variants || []).map((variant) => (
                      <Box key={variant.id}>
                        <ListItem
                          sx={{ py: 0.5 }}
                          secondaryAction={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
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
                                labelPlacement="start"
                              />
                              <IconButton
                                size="small"
                                onClick={() => setAddServerOpen({ gameId: game.id, variantId: variant.id })}
                                title={t('addServer')}
                                disabled={submitting}
                              >
                                <AddIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() =>
                                  setExpandedVariant(expandedVariant === variant.id ? null : variant.id)
                                }
                              >
                                {expandedVariant === variant.id ? (
                                  <ExpandLessIcon fontSize="small" />
                                ) : (
                                  <ExpandMoreIcon fontSize="small" />
                                )}
                              </IconButton>
                            </Box>
                          }
                        >
                          <ListItemText primary={variant.name} primaryTypographyProps={{ variant: 'body2' }} />
                        </ListItem>
                        <Collapse in={expandedVariant === variant.id} timeout="auto" unmountOnExit>
                          <List disablePadding sx={{ pl: 2 }}>
                            {(variant.servers || []).map((server) => (
                              <ListItem
                                key={server.id}
                                sx={{ py: 0.25 }}
                                secondaryAction={
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
                                    labelPlacement="start"
                                  />
                                }
                              >
                                <ListItemText
                                  primary={server.name}
                                  primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                                />
                              </ListItem>
                            ))}
                          </List>
                        </Collapse>
                      </Box>
                    ))}
                  </List>
                </Collapse>
              </Box>
            ))
          )}
        </List>
      )}

      <Dialog open={addGameOpen} onClose={() => !submitting && setAddGameOpen(false)}>
        <DialogTitle>{t('addGame')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={t('gameName')}
            fullWidth
            value={addGameName}
            onChange={(e) => setAddGameName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddGame()}
          />
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

      <Dialog open={!!addVariantOpen} onClose={() => !submitting && setAddVariantOpen(null)}>
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
          <Button onClick={() => setAddVariantOpen(null)} disabled={submitting}>
            {t('cancel')}
          </Button>
          <Button
            onClick={handleAddVariant}
            variant="contained"
            disabled={submitting || !addVariantName.trim()}
          >
            {t('add')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!addServerOpen} onClose={() => !submitting && setAddServerOpen(null)}>
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
          <Button
            onClick={handleAddServer}
            variant="contained"
            disabled={submitting || !addServerName.trim()}
          >
            {t('add')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
