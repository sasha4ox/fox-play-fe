'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Collapse from '@mui/material/Collapse';
import { useCookieConsentContext } from '@/contexts/CookieConsentContext';
import { CookieCategoryId } from '@/lib/cookieConsent';
import CookieIcon from '@mui/icons-material/Cookie';
import SettingsIcon from '@mui/icons-material/Settings';
import ChevronDownIcon from '@mui/icons-material/KeyboardArrowDown';
import ChevronUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { componentClass } from '@/lib/componentPath';
import styles from './CookieConsent.module.css';

const CATEGORY_IDS: CookieCategoryId[] = ['essential', 'analytics', 'marketing', 'functional'];

export default function CookieConsent() {
  const locale = useLocale();
  const t = useTranslations('CookieConsent');
  const {
    consent,
    showBanner,
    isSettingsOpen,
    acceptAll,
    rejectNonEssential,
    updateCategory,
    savePreferences,
    openSettings,
    closeSettings,
  } = useCookieConsentContext();

  const base = `/${locale}`;
  const privacyHref = `${base}/privacy`;
  const cookiePolicyHref = `${base}/cookie-policy`;

  if (!showBanner) return null;

  const currentConsent = consent ?? {
    essential: true,
    analytics: false,
    marketing: false,
    functional: false,
    timestamp: 0,
    version: '1',
  };

  const handleCustomize = () => {
    if (isSettingsOpen) {
      savePreferences(currentConsent);
    } else {
      openSettings();
    }
  };

  return (
    <Box
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
      aria-modal="true"
      className={`${styles.banner} ${componentClass('CookieConsent')}`}
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1300,
        bgcolor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.08)',
        maxWidth: '100vw',
      }}
    >
      <Box
        sx={{
          maxWidth: 900,
          mx: 'auto',
          px: { xs: 2, sm: 3 },
          py: 2.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 2 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <CookieIcon />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography id="cookie-consent-title" variant="h6" fontWeight={600} gutterBottom>
              {t('title')}
            </Typography>
            <Typography id="cookie-consent-desc" variant="body2" color="text.secondary">
              {t('description')}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
              <Link href={privacyHref} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.875rem' }}>
                {t('privacyPolicy')}
              </Link>
              <Typography component="span" color="text.secondary">
                •
              </Typography>
              <Link href={cookiePolicyHref} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.875rem' }}>
                {t('cookiePolicy')}
              </Link>
            </Box>
          </Box>
        </Box>

        <Collapse in={isSettingsOpen} id="cookie-settings-panel">
          <Box
            sx={{
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,
              p: 2,
              mb: 2,
              bgcolor: 'action.hover',
            }}
          >
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
              {t('customizeTitle')}
            </Typography>
            {CATEGORY_IDS.map((id) => (
              <Box
                key={id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  py: 1.5,
                  borderBottom: 1,
                  borderColor: 'divider',
                  '&:last-of-type': { borderBottom: 0 },
                }}
              >
                <Box>
                  <Typography variant="body2" fontWeight={500}>
                    {t(`category_${id}`)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t(`category_${id}_desc`)}
                  </Typography>
                </Box>
                <Switch
                  checked={currentConsent[id]}
                  disabled={id === 'essential'}
                  onChange={(_, checked) => updateCategory(id, checked)}
                  inputProps={{
                    'aria-label': t(`category_${id}`),
                  }}
                  color="primary"
                />
              </Box>
            ))}
          </Box>
        </Collapse>

        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1.5,
            alignItems: 'center',
          }}
        >
          <Button
            variant="contained"
            color="primary"
            onClick={acceptAll}
            sx={{ fontWeight: 600 }}
            aria-label={t('acceptAll')}
            autoFocus
          >
            {t('acceptAll')}
          </Button>
          <Button
            variant="outlined"
            color="inherit"
            onClick={rejectNonEssential}
            aria-label={t('rejectNonEssential')}
          >
            {t('rejectNonEssential')}
          </Button>
          <Button
            variant="text"
            color="inherit"
            startIcon={isSettingsOpen ? <ChevronUpIcon /> : <SettingsIcon />}
            onClick={handleCustomize}
            aria-expanded={isSettingsOpen}
            aria-controls="cookie-settings-panel"
            id="cookie-settings-trigger"
          >
            {isSettingsOpen ? t('savePreferences') : t('customize')}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
