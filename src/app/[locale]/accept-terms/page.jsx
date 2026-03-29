'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import MuiLink from '@mui/material/Link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Container from '@mui/material/Container';
import Alert from '@mui/material/Alert';
import { useAuthStore } from '@/store/authStore';
import { useAuthHydrated } from '@/hooks/useAuthHydrated';
import { acceptTerms, getProfile } from '@/lib/api';

export default function AcceptTermsPage() {
  const router = useRouter();
  const locale = useLocale();
  const base = `/${locale}`;
  const t = useTranslations('Form');
  const tPage = useTranslations('AcceptTerms');
  const authHydrated = useAuthHydrated();
  const token = useAuthStore((s) => s.token);
  const setAuth = useAuthStore((s) => s.setAuth);

  const [checking, setChecking] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const { control, handleSubmit, watch, formState: { isSubmitting } } = useForm({
    defaultValues: {
      termsAccepted: false,
      privacyAccepted: false,
      cryptoRiskAccepted: false,
    },
  });
  const termsAccepted = watch('termsAccepted');
  const privacyAccepted = watch('privacyAccepted');
  const cryptoRiskAccepted = watch('cryptoRiskAccepted');
  const registerConsentsComplete = !!(termsAccepted && privacyAccepted && cryptoRiskAccepted);

  const legalLink = (href) => (chunks) => (
    <MuiLink component={Link} href={href} target="_blank" rel="noopener noreferrer" underline="hover">
      {chunks}
    </MuiLink>
  );

  useEffect(() => {
    if (!authHydrated) return;
    if (!token) {
      router.replace(`/${locale}`);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const profile = await getProfile(token);
        if (cancelled) return;
        if (profile?.termsAcceptedAt) {
          router.replace(`/${locale}/dashboard`);
          return;
        }
      } catch (_) {
        // 403 TERMS_NOT_ACCEPTED — stay on page
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authHydrated, token, locale, router]);

  const onSubmit = async () => {
    setAuthError(null);
    setSubmitting(true);
    try {
      const data = await acceptTerms(token);
      const newToken = data?.token || token;
      const profile = await getProfile(newToken);
      if (profile?.id) {
        setAuth(
          {
            id: profile.id,
            email: profile.email,
            preferredCurrency: profile.preferredCurrency,
            nickname: profile.nickname,
            role: profile.role,
            termsAcceptedAt: profile.termsAcceptedAt,
          },
          newToken
        );
      }
      router.replace(`/${locale}/dashboard`);
    } catch (e) {
      setAuthError(e?.message || t('errorSubmit'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!authHydrated) {
    return (
      <Container sx={{ py: 4 }}>
        <Typography color="text.secondary">{tPage('checking')}</Typography>
      </Container>
    );
  }

  if (!token) return null;

  if (checking) {
    return (
      <Container sx={{ py: 4 }}>
        <Typography color="text.secondary">{tPage('checking')}</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h5" component="h1" sx={{ mb: 1 }}>
        {tPage('title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {tPage('description')}
      </Typography>

      <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Controller
          name="termsAccepted"
          control={control}
          rules={{
            validate: (v) => v === true || t('mandatatory'),
          }}
          render={({ field, fieldState: { error } }) => (
            <Box>
              <FormControlLabel
                sx={{ alignItems: 'center', m: 0 }}
                control={
                  <Checkbox
                    checked={!!field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Typography variant="body2" component="span" sx={{ lineHeight: 1.5 }}>
                    {t.rich('consentTermsRich', {
                      terms: legalLink(`${base}/terms`),
                      disclaimer: legalLink(`${base}/disclaimer`),
                    })}
                  </Typography>
                }
              />
              {error && (
                <Typography variant="caption" color="error" sx={{ display: 'block', ml: 4, mt: 0.25 }}>
                  {error.message}
                </Typography>
              )}
            </Box>
          )}
        />
        <Controller
          name="privacyAccepted"
          control={control}
          rules={{
            validate: (v) => v === true || t('mandatatory'),
          }}
          render={({ field, fieldState: { error } }) => (
            <Box>
              <FormControlLabel
                sx={{ alignItems: 'center', m: 0 }}
                control={
                  <Checkbox
                    checked={!!field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Typography variant="body2" component="span" sx={{ lineHeight: 1.5 }}>
                    {t.rich('consentPrivacyRich', {
                      privacy: legalLink(`${base}/privacy`),
                    })}
                  </Typography>
                }
              />
              {error && (
                <Typography variant="caption" color="error" sx={{ display: 'block', ml: 4, mt: 0.25 }}>
                  {error.message}
                </Typography>
              )}
            </Box>
          )}
        />
        <Controller
          name="cryptoRiskAccepted"
          control={control}
          rules={{
            validate: (v) => v === true || t('mandatatory'),
          }}
          render={({ field, fieldState: { error } }) => (
            <Box>
              <FormControlLabel
                sx={{ alignItems: 'center', m: 0 }}
                control={
                  <Checkbox
                    checked={!!field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Typography variant="body2" component="span" sx={{ lineHeight: 1.5 }}>
                    {t.rich('consentCryptoRich', {
                      crypto: legalLink(`${base}/crypto-risk`),
                    })}
                  </Typography>
                }
              />
              {error && (
                <Typography variant="caption" color="error" sx={{ display: 'block', ml: 4, mt: 0.25 }}>
                  {error.message}
                </Typography>
              )}
            </Box>
          )}
        />

        {authError && (
          <Alert severity="error" onClose={() => setAuthError(null)}>
            {authError}
          </Alert>
        )}

        <Button
          type="submit"
          variant="contained"
          color="secondary"
          fullWidth
          disabled={isSubmitting || submitting || !registerConsentsComplete}
        >
          {submitting || isSubmitting ? t('sending') : tPage('submit')}
        </Button>
      </Box>
    </Container>
  );
}
