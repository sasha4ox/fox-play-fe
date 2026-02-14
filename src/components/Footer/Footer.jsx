'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLocale } from 'next-intl';
import { useTranslations } from 'next-intl';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import MuiLink from '@mui/material/Link';
import { useCookieConsentContext } from '@/contexts/CookieConsentContext';

export default function Footer() {
  const [logoError, setLogoError] = useState(false);
  const locale = useLocale();
  const t = useTranslations('Footer');
  const { reopenBanner } = useCookieConsentContext();
  const base = `/${locale}`;

  const legalLinks = [
    { href: `${base}/terms`, label: t('termsOfService') },
    { href: `${base}/privacy`, label: t('privacy') },
    { href: `${base}/aml-compliance`, label: t('amlCompliance') },
    { href: `${base}/disclaimer`, label: t('disclaimer') },
  ];

  const policyLinks = [
    { href: `${base}/cookie-policy`, label: t('cookiePolicy') },
    { href: `${base}/crypto-risk`, label: t('cryptoRisk') },
  ];

  return (
    <Box
      component="footer"
      sx={{
        width: '100%',
        minWidth: '100%',
        mt: 'auto',
        bgcolor: '#1a1a1a',
        color: '#cccccc',
      }}
    >
      <Box
        sx={{
          maxWidth: 1200,
          mx: 'auto',
          px: { xs: 2, sm: 3 },
          pt: { xs: 4, md: 5 },
          pb: { xs: 3, md: 4 },
        }}
      >
        {/* Main columns - grid: 1 col mobile, 2 cols tablet, 4 cols desktop */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: '1fr 1fr',
              lg: '1.5fr 1fr 1fr 1fr',
            },
            gap: { xs: 3, sm: 4 },
            mb: { xs: 4, md: 5 },
          }}
        >
          {/* Brand column */}
          <Box>
            <Link href={base} style={{ textDecoration: 'none', display: 'inline-block', marginBottom: 8 }}>
              {logoError ? (
                <Typography
                  variant="h6"
                  component="span"
                  sx={{
                    fontWeight: 700,
                    color: '#fff',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                  }}
                >
                  {t('brand')}
                </Typography>
              ) : (
                <Image
                  src="/images/logo-purple-horizontal.png"
                  alt={t('brand')}
                  width={130}
                  height={28}
                  style={{ objectFit: 'contain', marginLeft: '-25px' }}
                  unoptimized
                  onError={() => setLogoError(true)}
                />
              )}
            </Link>
            <Typography
              variant="body2"
              sx={{
                color: '#b0b0b0',
                lineHeight: 1.6,
                mb: 0.5,
                maxWidth: 280,
              }}
            >
              {t('tagline')}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: '#a0d468',
                fontWeight: 600,
                letterSpacing: '0.04em',
                fontSize: '0.95rem',
              }}
            >
              {t('slogan')}
            </Typography>
          </Box>

          {/* Legal column */}
          <Box>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                color: '#fff',
                mb: 1.5,
                letterSpacing: '0.02em',
              }}
            >
              {t('legal')}
            </Typography>
            <Box component="nav" sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {legalLinks.map(({ href, label }) => (
                <MuiLink
                  key={href}
                  component={Link}
                  href={href}
                  sx={{
                    color: '#b0b0b0',
                    textDecoration: 'none',
                    fontSize: '0.9rem',
                    '&:hover': { color: '#fff' },
                  }}
                >
                  {label}
                </MuiLink>
              ))}
            </Box>
          </Box>

          {/* Policies column */}
          <Box>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                color: '#fff',
                mb: 1.5,
                letterSpacing: '0.02em',
              }}
            >
              {t('policies')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {policyLinks.map(({ href, label }) => (
                <MuiLink
                  key={href}
                  component={Link}
                  href={href}
                  sx={{
                    color: '#b0b0b0',
                    textDecoration: 'none',
                    fontSize: '0.9rem',
                    '&:hover': { color: '#fff' },
                  }}
                >
                  {label}
                </MuiLink>
              ))}
              <MuiLink
                component="button"
                type="button"
                onClick={reopenBanner}
                sx={{
                  color: '#b0b0b0',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  bg: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  p: 0,
                  font: 'inherit',
                  '&:hover': { color: '#fff' },
                }}
              >
                {t('cookiePreferences')}
              </MuiLink>
            </Box>
          </Box>

          {/* Support column */}
          <Box>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                color: '#fff',
                mb: 1.5,
                letterSpacing: '0.02em',
              }}
            >
              {t('support')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <MuiLink
                component={Link}
                href={`${base}/contact`}
                sx={{
                  color: '#b0b0b0',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  '&:hover': { color: '#fff' },
                }}
              >
                {t('contactUs')}
              </MuiLink>
            </Box>
          </Box>
        </Box>

        {/* Bottom bar */}
        <Box
          sx={{
            pt: { xs: 2, md: 3 },
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: '#888',
              fontSize: '0.85rem',
            }}
          >
            © {new Date().getFullYear()} {t('brand')}. {t('copyright')}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
