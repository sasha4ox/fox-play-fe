'use client';

import { useState, useEffect, useRef } from 'react';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import CountrySelect from '@/components/CountrySelect/CountrySelect';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { redirect, useRouter } from 'next/navigation';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import MuiLink from '@mui/material/Link';
import { GoogleLogin } from '@react-oauth/google';
import { useAuthStore } from '@/store/authStore';
import { getApiBase } from '@/lib/api';
import { componentClass } from '@/lib/componentPath';
import styles from './form.module.css';

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

export default function Form({ popupMode = false, onLoginSuccess }) {
  const [isLoginForm, setIsloginForm] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authSuccess, setAuthSuccess] = useState(null);
  const [resendStatus, setResendStatus] = useState(null);
  const [emailForResend, setEmailForResend] = useState('');
  const [showActivationCooldown, setShowActivationCooldown] = useState(false);
  const [resendCooldownSeconds, setResendCooldownSeconds] = useState(0);
  const [lastRegisteredEmail, setLastRegisteredEmail] = useState('');
  const { control, handleSubmit, setValue, getValues, setError, formState: { isSubmitting } } = useForm({
    defaultValues: {
      password: "",
      email: "",
      nickname: "",
      countryCode: "",
      termsAccepted: false,
      privacyAccepted: false,
      cryptoRiskAccepted: false,
    },
  });
  const suggestedCountryFetchedRef = useRef(false);
  const locale = useLocale();
  const base = `/${locale}`;
  const router = useRouter();
  const t = useTranslations('Form');
  const [termsAccepted, privacyAccepted, cryptoRiskAccepted] = useWatch({
    control,
    name: ['termsAccepted', 'privacyAccepted', 'cryptoRiskAccepted'],
    defaultValue: [false, false, false],
  });
  const registerConsentsComplete = !!(termsAccepted && privacyAccepted && cryptoRiskAccepted);

  function TermsLinkLabel(chunks) {
    return (
      <MuiLink component={Link} href={`${base}/terms`} target="_blank" rel="noopener noreferrer" underline="hover">
        {chunks}
      </MuiLink>
    );
  }
  function DisclaimerLinkLabel(chunks) {
    return (
      <MuiLink component={Link} href={`${base}/disclaimer`} target="_blank" rel="noopener noreferrer" underline="hover">
        {chunks}
      </MuiLink>
    );
  }
  function PrivacyLinkLabel(chunks) {
    return (
      <MuiLink component={Link} href={`${base}/privacy`} target="_blank" rel="noopener noreferrer" underline="hover">
        {chunks}
      </MuiLink>
    );
  }
  function CryptoRiskLinkLabel(chunks) {
    return (
      <MuiLink component={Link} href={`${base}/crypto-risk`} target="_blank" rel="noopener noreferrer" underline="hover">
        {chunks}
      </MuiLink>
    );
  }

  const handleChangeForm = () => {
    setAuthError(null);
    setAuthSuccess(null);
    setShowActivationCooldown(false);
    setResendCooldownSeconds(0);
    setLastRegisteredEmail('');
    setValue('termsAccepted', false);
    setValue('privacyAccepted', false);
    setValue('cryptoRiskAccepted', false);
    setIsloginForm(!isLoginForm);
  };

  useEffect(() => {
    if (!showActivationCooldown || resendCooldownSeconds <= 0) return;
    const t = setTimeout(() => setResendCooldownSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [showActivationCooldown, resendCooldownSeconds]);
  

  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    try {
      const err = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('googleSignInError');
      if (err) {
        sessionStorage.removeItem('googleSignInError');
        setAuthError(err);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (isLoginForm || suggestedCountryFetchedRef.current) return;
    suggestedCountryFetchedRef.current = true;
    fetch(`${getApiBase()}/auth/suggested-country`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.countryCode && getValues('countryCode') === '') {
          setValue('countryCode', data.countryCode);
        }
      })
      .catch(() => {});
  }, [isLoginForm, setValue, getValues]);

  const getAuthErrorMessage = (responseBody) => {
    const msg = responseBody?.error?.message ?? responseBody?.message ?? '';
    if (/invalid credentials/i.test(msg)) return t('invalidCredentials');
    if (/user already exists/i.test(msg)) return t('emailAlreadyRegistered');
    if (/nickname is required/i.test(msg)) return t('nicknameRequired');
    if (/country is required/i.test(msg)) return t('countryRequired');
    if (/sent a new activation link/i.test(msg)) return t('activationEmailSentAgain');
    if (/verify your email/i.test(msg)) return t('pleaseVerifyEmail');
    if (/account is already verified/i.test(msg)) return t('alreadyVerified');
    if (/no account found with this email/i.test(msg)) return t('noAccountWithEmail');
    return msg || t('errorSubmit');
  };

  const handleLogin = async (data) => {
    setAuthError(null);
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const parsedResponse = await response.json();
    const res = parsedResponse.response;

    if (response.ok && res?.token) {
      const user = res.user ?? { id: res.userId, email: data.email };
      setAuth(user, res.token);
      setAuthSuccess(t('loginSuccess'));
      if (popupMode && onLoginSuccess) {
        onLoginSuccess();
        return;
      }
      redirect(`/${locale}/dashboard`);
    } else {
      const errMsg = getAuthErrorMessage(parsedResponse?.response ?? parsedResponse);
      setAuthError(errMsg);
      if (errMsg === t('pleaseVerifyEmail') || errMsg === t('activationEmailSentAgain')) setEmailForResend(data.email ?? '');
    }
  };

  // Popup/iframe flow: Google returns credential (id_token) in-page; we send to backend
  const handleGoogleCredential = async (credentialResponse) => {
    setAuthError(null);
    try {
      const res = await fetch('/api/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });
      const data = await res.json();
      if (res.ok && data?.token) {
        const user = data.user ?? { id: data.userId, email: data.email, nickname: data.nickname };
        setAuth(user, data.token);
        setAuthSuccess(t('loginSuccess'));
        if (popupMode && onLoginSuccess) {
          onLoginSuccess();
          return;
        }
        router.push(`/${locale}/dashboard`);
      } else {
        setAuthError(getAuthErrorMessage(data) || t('googleSignInError'));
      }
    } catch (err) {
      setAuthError(t('googleSignInError'));
    }
  };

  const handleRegister = async (data) => {
    setAuthError(null);
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const parsed = await response.json();
    const res = parsed.response ?? parsed;
    if (response.ok && res?.token) {
      const user = res.user ?? { id: res.userId, email: data.email, nickname: data.nickname };
      setAuth(user, res.token);
      setAuthSuccess(t('registerSuccess'));
      if (popupMode && onLoginSuccess) {
        onLoginSuccess();
        return;
      }
      redirect(`/${locale}/dashboard`);
    }
    if (response.ok && res?.message) {
      setAuthSuccess(res.message);
      setShowActivationCooldown(true);
      setResendCooldownSeconds(60);
      setLastRegisteredEmail(data.email ?? '');
      return response;
    }
    setAuthError(getAuthErrorMessage(res));
    return response;
  };

  const onSubmit = async (data) => {
    setAuthError(null);
    setAuthSuccess(null);
    try {
      if (isLoginForm) {
        await handleLogin(data);
      } else {
        const { termsAccepted: _t, privacyAccepted: _p, cryptoRiskAccepted: _c, ...registerData } = data;
        await handleRegister(registerData);
      }
    } catch (err) {
      setAuthError(t('errorSubmit'));
      setError('email', { type: 'custom', message: t('errorSubmit') });
    }
  }; 

  return (
    <section className={`${styles.formWrapper} ${popupMode ? styles.formWrapperPopup : ''} ${componentClass('Form')}`}>
      <h2>{isLoginForm ? t('login') : t('register')}</h2>
      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        <Controller
          name="email"
          control={control}
          rules={{
            required: t('mandatatory'),
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: t('emailInvalid'),
            },
          }}
          render={({ field, fieldState: { error } }) => (
            <TextField
              {...field}
              label={t('email')}
              variant="outlined"
              fullWidth
              error={!!error}
              helperText={error ? error.message : null}
            />
          )}
        />
        <Controller
          name="password"
          control={control}
          rules={{ required: t('mandatatory') }}
          render={({ field, fieldState: { error } }) => (
              <TextField
                  {...field}
                  label={t('password')}
                  type={"password"}
                  variant="outlined"
                  error={!!error}
                  helperText={error ? error.message : null}
              />
          )}
        />
        {!isLoginForm && (
          <Controller
            name="nickname"
            control={control}
            rules={{ required: t('mandatatory') }}
            render={({ field, fieldState: { error } }) => (
              <TextField
                {...field}
                label={t('nickname')}
                variant="outlined"
                fullWidth
                sx={{ mt: 2 }}
                placeholder={t('nicknamePlaceholder')}
                error={!!error}
                helperText={error ? error.message : null}
              />
            )}
          />
        )}
        {!isLoginForm && (
          <Controller
            name="countryCode"
            control={control}
            rules={{ required: t('mandatatory') }}
            render={({ field, fieldState: { error } }) => (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  {t('whereAreYouFrom')}
                </Typography>
                <CountrySelect
                  selected={field.value || ''}
                  onSelect={field.onChange}
                  placeholder={t('selectCountry')}
                  fullWidth
                />
                {error && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                    {error.message}
                  </Typography>
                )}
              </Box>
            )}
          />
        )}
        {!isLoginForm && (
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Controller
              name="termsAccepted"
              control={control}
              shouldUnregister
              rules={{
                validate: (v) => v === true || t('mandatatory'),
              }}
              render={({ field, fieldState: { error } }) => (
                <Box>
                  <FormControlLabel
                    sx={{ alignItems: 'flex-start', m: 0 }}
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
                          terms: TermsLinkLabel,
                          disclaimer: DisclaimerLinkLabel,
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
              shouldUnregister
              rules={{
                validate: (v) => v === true || t('mandatatory'),
              }}
              render={({ field, fieldState: { error } }) => (
                <Box>
                  <FormControlLabel
                    sx={{ alignItems: 'flex-start', m: 0 }}
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
                          privacy: PrivacyLinkLabel,
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
              shouldUnregister
              rules={{
                validate: (v) => v === true || t('mandatatory'),
              }}
              render={({ field, fieldState: { error } }) => (
                <Box>
                  <FormControlLabel
                    sx={{ alignItems: 'flex-start', m: 0 }}
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
                          crypto: CryptoRiskLinkLabel,
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
          </Box>
        )}
        {authError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => { setAuthError(null); setEmailForResend(''); setResendStatus(null); }}>
            {authError}
            {(authError === t('pleaseVerifyEmail') || authError === t('activationEmailSentAgain')) && emailForResend && (
              <Button
                size="small"
                variant="outlined"
                sx={{ mt: 1, display: 'block' }}
                disabled={resendStatus === 'sending'}
                onClick={async () => {
                  setResendStatus('sending');
                  try {
                    const r = await fetch('/api/auth/resend-activation', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email: emailForResend }),
                    });
                    const data = await r.json();
                    if (r.ok) setResendStatus('sent');
                    else setResendStatus(data?.message || 'Failed');
                  } catch {
                    setResendStatus('Failed');
                  }
                }}
              >
                {resendStatus === 'sending' ? t('sending') : resendStatus === 'sent' ? t('emailSentSuccess') : t('resendActivation')}
              </Button>
            )}
          </Alert>
        )}
        {authSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {authSuccess}
            {showActivationCooldown && lastRegisteredEmail && (
              <Box sx={{ mt: 1.5 }}>
                {resendCooldownSeconds > 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    {t('tryAgainInSeconds', { seconds: resendCooldownSeconds })}
                  </Typography>
                ) : (
                  <Button
                    size="small"
                    variant="outlined"
                    sx={{ mt: 0.5 }}
                    disabled={resendStatus === 'sending'}
                    onClick={async () => {
                      setResendStatus('sending');
                      try {
                        const r = await fetch('/api/auth/resend-activation', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email: lastRegisteredEmail }),
                        });
                        const data = await r.json();
                        if (r.ok) {
                          setResendStatus('sent');
                          setResendCooldownSeconds(60);
                          setAuthSuccess(data?.message ?? t('emailSentSuccess'));
                        } else setResendStatus(data?.message || 'Failed');
                      } catch {
                        setResendStatus('Failed');
                      }
                    }}
                  >
                    {resendStatus === 'sending' ? t('sending') : resendStatus === 'sent' ? t('emailSentSuccess') : t('didntReceiveEmailTryAgain')}
                  </Button>
                )}
              </Box>
            )}
          </Alert>
        )}
        <Button
          type="submit"
          variant="contained"
          color="secondary"
          fullWidth
          className={`${styles.send} ${componentClass('Form', 'SubmitBtn')}`}
          disabled={isSubmitting || (!isLoginForm && !registerConsentsComplete)}
        >
          {isSubmitting ? t('sending') : t('submit')}
        </Button>
        {googleClientId && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', my: 2 }}>
              <Divider flexItem sx={{ borderColor: 'divider' }} />
              <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
                {t('or')}
              </Typography>
              <Divider flexItem sx={{ borderColor: 'divider' }} />
            </Box>
            <div className={styles.googleBtnWrapper}>
              <div className={styles.googleBtnContainer}>
                <GoogleLogin
                  onSuccess={handleGoogleCredential}
                  onError={() => setAuthError(t('googleSignInError'))}
                  theme="outline"
                  size="large"
                  text="continue_with"
                  shape="rectangular"
                  width="100%"
                  locale={locale === 'ua' ? 'uk' : 'en'}
                />
              </div>
            </div>
          </>
        )}
        <Button type="button" variant="text" color="secondary" fullWidth onClick={handleChangeForm} sx={{ mt: 1 }}>
          {isLoginForm ? t('noAccount') : t('haveAccount')}
        </Button>
        
      </form>
    </section>
  );
}
