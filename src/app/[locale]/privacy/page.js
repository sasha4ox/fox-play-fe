import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Privacy' });
  return { title: t('title') };
}

export default async function PrivacyPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Privacy');
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

      <Typography variant="body1" component="div" sx={{ whiteSpace: 'pre-line', mb: 3 }}>
        {t('intro')}
      </Typography>

      <Typography variant="h6" component="h2" fontWeight={600} gutterBottom>
        {t('purposeTitle')}
      </Typography>
      <Typography variant="body1" component="div" sx={{ whiteSpace: 'pre-line', mb: 3 }}>
        {t('purposeList')}
      </Typography>

      <Typography variant="h6" component="h2" fontWeight={600} gutterBottom>
        {t('dataSharingTitle')}
      </Typography>
      <Typography variant="body1" component="div" sx={{ whiteSpace: 'pre-line' }}>
        {t('dataSharingList')}
      </Typography>
    </Container>
  );
}
