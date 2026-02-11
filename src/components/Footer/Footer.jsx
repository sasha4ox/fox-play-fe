'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useTranslations } from 'next-intl';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import MuiLink from '@mui/material/Link';

export default function Footer() {
  const locale = useLocale();
  const t = useTranslations('Footer');
  const base = `/${locale}`;

  const links = [
    { href: `${base}/terms`, label: t('termsOfService') },
    { href: `${base}/aml-compliance`, label: t('amlCompliance') },
    { href: `${base}/privacy`, label: t('privacy') },
    { href: `${base}/crypto-risk`, label: t('cryptoRisk') },
    { href: `${base}/disclaimer`, label: t('disclaimer') },
  ];

  return (
    <Box
      component="footer"
      sx={{
        width: '100%',
        minWidth: '100%',
        mt: 'auto',
        py: 2,
        px: 2,
        borderTop: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Box
        sx={{
          maxWidth: 1200,
          mx: 'auto',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
        }}
      >
        {links.map(({ href, label }) => (
          <MuiLink
            key={href}
            component={Link}
            href={href}
            color="text.secondary"
            underline="hover"
            sx={{ fontWeight: 500 }}
          >
            {label}
          </MuiLink>
        ))}
        <Typography variant="body2" color="text.secondary">
          © {new Date().getFullYear()} {t('brand')}
        </Typography>
      </Box>
    </Box>
  );
}
