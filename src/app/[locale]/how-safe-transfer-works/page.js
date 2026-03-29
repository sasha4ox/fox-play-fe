import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import PersonIcon from '@mui/icons-material/Person';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import DescriptionIcon from '@mui/icons-material/Description';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'SafeTransferHowItWorks' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  };
}

const stepKeys = ['step1', 'step2', 'step3', 'step4', 'step5'];

export default async function HowSafeTransferWorksPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('SafeTransferHowItWorks');
  const base = `/${locale}`;

  const agentItems = [
    { titleKey: 'agents1Title', bodyKey: 'agents1Body', Icon: PersonIcon },
    { titleKey: 'agents2Title', bodyKey: 'agents2Body', Icon: TrackChangesIcon },
    { titleKey: 'agents3Title', bodyKey: 'agents3Body', Icon: DescriptionIcon },
  ];

  const regularBullets = ['compareRegular1', 'compareRegular2', 'compareRegular3'];
  const safeBullets = ['compareSafe1', 'compareSafe2', 'compareSafe3', 'compareSafe4'];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#0a0a0a',
        color: 'rgba(255,255,255,0.92)',
        py: { xs: 3, md: 5 },
      }}
    >
      <Container maxWidth="md">
        <Box sx={{ mb: 3 }}>
          <Link href={base} style={{ textDecoration: 'none' }}>
            <Button
              size="small"
              sx={{
                mb: 2,
                color: 'rgba(255,255,255,0.75)',
                borderColor: 'rgba(255,255,255,0.25)',
                '&:hover': { borderColor: 'rgba(255,255,255,0.45)', bgcolor: 'rgba(255,255,255,0.06)' },
              }}
              variant="outlined"
            >
              {t('backToHome')}
            </Button>
          </Link>
        </Box>

        <Chip
          label={t('heroBadge')}
          size="small"
          sx={{
            mb: 2,
            fontWeight: 700,
            letterSpacing: 0.06,
            bgcolor: '#166534',
            color: '#fff',
            '& .MuiChip-label': { px: 1.5 },
          }}
        />
        <Typography variant="h3" component="h1" fontWeight={800} sx={{ color: '#fff', mb: 1.5 }}>
          {t('heroTitle')}
        </Typography>
        <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.82)', maxWidth: 640, mb: 3 }}>
          {t('heroSubtitle')}
        </Typography>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)', mb: 4 }} />

        <Box
          sx={{
            p: 2.5,
            mb: 5,
            borderRadius: 2,
            border: '2px solid',
            borderColor: '#22c55e',
            bgcolor: 'rgba(34, 197, 94, 0.06)',
          }}
        >
          <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#4ade80', mb: 1.5 }}>
            {t('commitmentTitle')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.88)', lineHeight: 1.65 }}>
            {t('commitmentBody')}
          </Typography>
        </Box>

        <Typography
          variant="overline"
          sx={{ display: 'block', color: 'rgba(255,255,255,0.45)', letterSpacing: 0.12, mb: 2 }}
        >
          {t('sectionHow')}
        </Typography>
        <Stack spacing={0} sx={{ mb: 5 }}>
          {stepKeys.map((key, idx) => (
            <Box key={key} sx={{ display: 'flex', gap: 2, pb: idx < stepKeys.length - 1 ? 2.5 : 0 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 32, flexShrink: 0 }}>
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#fff',
                  }}
                >
                  {idx + 1}
                </Box>
                {idx < stepKeys.length - 1 && (
                  <Box sx={{ width: 2, flex: 1, minHeight: 24, bgcolor: 'rgba(255,255,255,0.15)', mt: 0.5 }} />
                )}
              </Box>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.65, pt: 0.25 }}>
                {t(key)}
              </Typography>
            </Box>
          ))}
        </Stack>

        <Typography
          variant="overline"
          sx={{ display: 'block', color: 'rgba(255,255,255,0.45)', letterSpacing: 0.12, mb: 2 }}
        >
          {t('sectionAgents')}
        </Typography>
        <Stack spacing={2} sx={{ mb: 5 }}>
          {agentItems.map(({ titleKey, bodyKey, Icon }) => (
            <Box
              key={titleKey}
              sx={{
                display: 'flex',
                gap: 2,
                p: 2,
                borderRadius: 1.5,
                bgcolor: 'rgba(30, 58, 95, 0.35)',
                border: '1px solid rgba(96, 165, 250, 0.25)',
              }}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  flexShrink: 0,
                  borderRadius: 1,
                  bgcolor: '#1d4ed8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon sx={{ color: '#fff', fontSize: 24 }} />
              </Box>
              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#93c5fd', mb: 0.5 }}>
                  {t(titleKey)}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.82)', lineHeight: 1.6 }}>
                  {t(bodyKey)}
                </Typography>
              </Box>
            </Box>
          ))}
        </Stack>

        <Typography
          variant="overline"
          sx={{ display: 'block', color: 'rgba(255,255,255,0.45)', letterSpacing: 0.12, mb: 2 }}
        >
          {t('sectionAccountability')}
        </Typography>
        <Stack spacing={1.5} sx={{ mb: 5 }}>
          {[t('acc1'), t('acc2'), t('acc3')].map((text, i) => (
            <Box
              key={i}
              sx={{
                display: 'flex',
                gap: 1.5,
                alignItems: 'flex-start',
                p: 1.5,
                borderRadius: 1,
                bgcolor: 'rgba(234, 179, 8, 0.08)',
                border: '1px solid rgba(234, 179, 8, 0.25)',
              }}
            >
              <WarningAmberIcon sx={{ color: '#facc15', fontSize: 22, mt: 0.25 }} />
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>
                {text}
              </Typography>
            </Box>
          ))}
          <Box
            sx={{
              display: 'flex',
              gap: 1.5,
              alignItems: 'flex-start',
              p: 1.5,
              borderRadius: 1,
              bgcolor: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.35)',
            }}
          >
            <CheckCircleIcon sx={{ color: '#4ade80', fontSize: 22, mt: 0.25 }} />
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.88)', lineHeight: 1.6 }}>
              {t('acc4')}
            </Typography>
          </Box>
        </Stack>

        <Typography
          variant="overline"
          sx={{ display: 'block', color: 'rgba(255,255,255,0.45)', letterSpacing: 0.12, mb: 2 }}
        >
          {t('sectionFee')}
        </Typography>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block' }}>
              {t('feeSafeLabel')}
            </Typography>
            <Typography variant="h4" fontWeight={800} sx={{ color: '#fff', my: 0.5 }}>
              {t('feeSafeValue')}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)' }}>
              {t('feeSafeHint')}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block' }}>
              {t('feeMinLabel')}
            </Typography>
            <Typography variant="h4" fontWeight={800} sx={{ color: '#fff', my: 0.5 }}>
              {t('feeMinValue')}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)' }}>
              {t('feeMinHint')}
            </Typography>
          </Grid>
        </Grid>
        <Box
          sx={{
            p: 2,
            mb: 5,
            borderRadius: 1,
            bgcolor: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.65 }}>
            {t('feeExample')}
          </Typography>
        </Box>

        <Typography
          variant="overline"
          sx={{ display: 'block', color: 'rgba(255,255,255,0.45)', letterSpacing: 0.1, mb: 2 }}
        >
          {t('sectionCompare')}
        </Typography>
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ color: 'rgba(255,255,255,0.9)', mb: 1.5 }}>
              {t('compareRegularTitle')}
            </Typography>
            <Stack component="ul" sx={{ m: 0, pl: 2.5, color: 'rgba(255,255,255,0.8)' }}>
              {regularBullets.map((k) => (
                <Typography key={k} component="li" variant="body2" sx={{ mb: 1, lineHeight: 1.6 }}>
                  {t(k)}
                </Typography>
              ))}
            </Stack>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                p: 2,
                height: '100%',
                borderRadius: 1.5,
                border: '2px solid #22c55e',
                bgcolor: 'rgba(34, 197, 94, 0.08)',
              }}
            >
              <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#4ade80', mb: 1.5 }}>
                {t('compareSafeTitle')}
              </Typography>
              <Stack component="ul" sx={{ m: 0, pl: 2.5 }}>
                {safeBullets.map((k) => (
                  <Typography key={k} component="li" variant="body2" sx={{ mb: 1, lineHeight: 1.6, color: 'rgba(255,255,255,0.88)' }}>
                    {t(k)}
                  </Typography>
                ))}
              </Stack>
            </Box>
          </Grid>
        </Grid>

        <Stack spacing={2} sx={{ textAlign: 'center', pt: 2, pb: 4 }}>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.78)', lineHeight: 1.7 }}>
            {t('footer1')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.78)', lineHeight: 1.7 }}>
            {t('footer2')}
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}
