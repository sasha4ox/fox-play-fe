import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'CookiePolicy' });
  return { title: t('title') };
}

export default async function CookiePolicyPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('CookiePolicy');
  const base = `/${locale}`;

  return (
    <Container sx={{ py: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Link href={base} style={{ textDecoration: 'none' }}>
          <Button size="small" sx={{ mb: 2 }}>
            {t('backToHome')}
          </Button>
        </Link>
      </Box>

      <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
        {t('title')}
      </Typography>
      <Typography variant="h6" color="text.secondary" gutterBottom>
        {t('subtitle')}
      </Typography>

      <Typography variant="h6" component="h2" fontWeight={600} gutterBottom sx={{ mt: 3 }}>
        {t('s1Title')}
      </Typography>
      <Typography variant="body1" component="div" sx={{ whiteSpace: 'pre-line', mb: 3 }}>
        {t('s1Content')}
      </Typography>

      <Typography variant="h6" component="h2" fontWeight={600} gutterBottom>
        {t('s2Title')}
      </Typography>
      <Typography variant="body1" component="div" sx={{ whiteSpace: 'pre-line', mb: 2 }}>
        {t('s2Intro')}
      </Typography>
      <Box component="ul" sx={{ pl: 2.5, mb: 3 }}>
        <Box component="li" sx={{ mb: 1 }}>
          <Typography variant="subtitle2" fontWeight={600}>{t('essentialTitle')}</Typography>
          <Typography variant="body2" color="text.secondary">{t('essentialDesc')}</Typography>
        </Box>
        <Box component="li" sx={{ mb: 1 }}>
          <Typography variant="subtitle2" fontWeight={600}>{t('analyticsTitle')}</Typography>
          <Typography variant="body2" color="text.secondary">{t('analyticsDesc')}</Typography>
        </Box>
        <Box component="li" sx={{ mb: 1 }}>
          <Typography variant="subtitle2" fontWeight={600}>{t('securityTitle')}</Typography>
          <Typography variant="body2" color="text.secondary">{t('securityDesc')}</Typography>
        </Box>
        <Box component="li" sx={{ mb: 1 }}>
          <Typography variant="subtitle2" fontWeight={600}>{t('marketingTitle')}</Typography>
          <Typography variant="body2" color="text.secondary">{t('marketingDesc')}</Typography>
        </Box>
      </Box>

      <Typography variant="h6" component="h2" fontWeight={600} gutterBottom>
        {t('s3Title')}
      </Typography>
      <Typography variant="body1" component="div" sx={{ whiteSpace: 'pre-line', mb: 3 }}>
        {t('s3Content')}
      </Typography>

      <Typography variant="h6" component="h2" fontWeight={600} gutterBottom>
        {t('s4Title')}
      </Typography>
      <Typography variant="body1" component="div" sx={{ whiteSpace: 'pre-line', mb: 3 }}>
        {t('s4Content')}
      </Typography>

      <Typography variant="h6" component="h2" fontWeight={600} gutterBottom>
        {t('s5Title')}
      </Typography>
      <Typography variant="body1" component="div" sx={{ whiteSpace: 'pre-line' }}>
        {t('s5Content')}
      </Typography>
    </Container>
  );
}
