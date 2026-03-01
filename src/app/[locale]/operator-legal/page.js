import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'OperatorLegal' });
  return { title: t('title') };
}

export default async function OperatorLegalPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('OperatorLegal');
  const base = `/${locale}`;

  const sections = [
    { titleKey: 's1Title', contentKey: 's1Content' },
    { titleKey: 's2Title', contentKey: 's2Content' },
    { titleKey: 's3Title', contentKey: 's3Content' },
    { titleKey: 's4Title', contentKey: 's4Content' },
    { titleKey: 's5Title', contentKey: 's5Content' },
  ];

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
      <Typography variant="body1" component="div" sx={{ whiteSpace: 'pre-line', mb: 4 }}>
        {t('intro')}
      </Typography>

      {sections.map(({ titleKey, contentKey }, idx) => (
        <Box key={idx} sx={{ mb: 3 }}>
          <Typography variant="h6" component="h2" fontWeight={600} gutterBottom>
            {idx + 1}. {t(titleKey)}
          </Typography>
          <Typography variant="body1" component="div" sx={{ whiteSpace: 'pre-line' }}>
            {t(contentKey)}
          </Typography>
        </Box>
      ))}
    </Container>
  );
}
