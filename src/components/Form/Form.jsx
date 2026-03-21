'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import InputAdornment from '@mui/material/InputAdornment';
import CountrySelect from '@/components/CountrySelect/CountrySelect';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import MuiLink from '@mui/material/Link';
import AlternateEmailIcon from '@mui/icons-material/AlternateEmail';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import { GoogleLogin } from '@react-oauth/google';
import { useAuthStore } from '@/store/authStore';
import { getApiBase, requestPasswordReset } from '@/lib/api';
import { useLoginModalStore } from '@/store/loginModalStore';
import { componentClass } from '@/lib/componentPath';
import styles from './form.module.css';

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

function safeNextPath(raw) {
  if (!raw || typeof raw !== 'string') return null;
  if (!raw.startsWith('/') || raw.startsWith('//')) return null;
  return raw;
}

function FormInner({ mode, popupMode = false, onLoginSuccess }) {
  const [authError, setAuthError] = useState(null);
  const [authSuccess, setAuthSuccess] = useState(null);
  const [resendStatus, setResendStatus] = useState(null);
  const [emailForResend, setEmailForResend] = useState('');
  const [showActivationCooldown, setShowActivationCooldown] = useState(false);
  const [resendCooldownSeconds, setResendCooldownSeconds] = useState(0);
  const [lastRegisteredEmail, setLastRegisteredEmail] = useState('');
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState(null);
  const [forgotError, setForgotError] = useState(null);

  const { control, handleSubmit, setValue, getValues, setError, formState: { isSubmitting } } = useForm({
    defaultValues: {
      password: '',
      confirmPassword: '',
      email: '',
      nickname: '',
      countryCode: '',
      termsAccepted: false,
      privacyAccepted: false,
      cryptoRiskAccepted: false,
    },
  });
  const suggestedCountryFetchedRef = useRef(false);
  const locale = useLocale();
  const base = `/${locale}`;
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('Form');
  const tAuth = useTranslations('AuthPage');
  const closeLoginModal = useLoginModalStore((s) => s.closeModal);

  const [termsAccepted, privacyAccepted, cryptoRiskAccepted] = useWatch({
    control,
    name: ['termsAccepted', 'privacyAccepted', 'cryptoRiskAccepted'],
    defaultValue: [false, false, false],
  });
  const registerConsentsComplete = !!(termsAccepted && privacyAccepted && cryptoRiskAccepted);
  const isLoginForm = mode === 'login';
  const isAuthPage = !popupMode;
  const isRegisterAuthPage = isAuthPage && mode === 'register';

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

  useEffect(() => {
    if (!showActivationCooldown || resendCooldownSeconds <= 0) return;
    const timer = setTimeout(() => setResendCooldownSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
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
    if (mode !== 'register' || suggestedCountryFetchedRef.current) return;
    suggestedCountryFetchedRef.current = true;
    fetch(`${getApiBase()}/auth/suggested-country`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.countryCode && getValues('countryCode') === '') {
          setValue('countryCode', data.countryCode);
        }
      })
      .catch(() => {});
  }, [mode, setValue, getValues]);

  const postAuthRedirect = () => {
    const q = safeNextPath(searchParams.get('next'));
    router.replace(q || `/${locale}/dashboard`);
  };

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
      body: JSON.stringify({ email: data.email, password: data.password }),
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
      postAuthRedirect();
    } else {
      const errMsg = getAuthErrorMessage(parsedResponse?.response ?? parsedResponse);
      setAuthError(errMsg);
      if (errMsg === t('pleaseVerifyEmail') || errMsg === t('activationEmailSentAgain')) setEmailForResend(data.email ?? '');
    }
  };

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
        postAuthRedirect();
      } else {
        setAuthError(getAuthErrorMessage(data) || t('googleSignInError'));
      }
    } catch (err) {
      setAuthError(t('googleSignInError'));
    }
  };

  const handleRegister = async (data) => {
    setAuthError(null);
    const { termsAccepted: _t, privacyAccepted: _p, cryptoRiskAccepted: _c, confirmPassword: _cp, ...registerData } = data;
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registerData),
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
      postAuthRedirect();
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
        await handleRegister(data);
      }
    } catch (err) {
      setAuthError(t('errorSubmit'));
      setError('email', { type: 'custom', message: t('errorSubmit') });
    }
  };

  const openForgot = () => {
    setForgotEmail(getValues('email') || '');
    setForgotMessage(null);
    setForgotError(null);
    setForgotOpen(true);
  };

  const submitForgot = async () => {
    const email = (forgotEmail || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setForgotError(tAuth('forgotInvalidEmail'));
      return;
    }
    setForgotLoading(true);
    setForgotError(null);
    setForgotMessage(null);
    try {
      await requestPasswordReset(email);
      setForgotMessage(tAuth('forgotSuccess'));
    } catch (e) {
      setForgotError(e?.message || tAuth('forgotError'));
    } finally {
      setForgotLoading(false);
    }
  };

  const submitLabel = isSubmitting
    ? t('sending')
    : isLoginForm
      ? t('login')
      : t('register');

  const fieldSlotProps = isAuthPage
    ? {
        input: {
          sx: { minHeight: 48, boxSizing: 'border-box' },
        },
      }
    : undefined;

  return (
    <section
      className={`${styles.formWrapper} ${popupMode ? styles.formWrapperPopup : ''} ${isAuthPage ? styles.formWrapperAuth : ''} ${componentClass('Form')}`}
    >
      {isAuthPage && (
        <Box
          sx={{
            mb: isRegisterAuthPage ? { xs: 3, md: 2 } : 3,
            textAlign: { xs: 'left', sm: 'left' },
          }}
        >
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600, color: 'text.primary', mb: 1 }}>
            {isLoginForm ? tAuth('welcomeTitle') : tAuth('registerWelcomeTitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isLoginForm ? tAuth('welcomeSubtitle') : tAuth('registerWelcomeSubtitle')}
          </Typography>
        </Box>
      )}
      {!isAuthPage && (
        <h2>{isLoginForm ? t('login') : t('register')}</h2>
      )}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className={`${styles.form} ${isRegisterAuthPage ? styles.formRegisterDesktopTight : ''}`}
      >
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
              slotProps={fieldSlotProps}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <AlternateEmailIcon sx={{ color: 'text.secondary', fontSize: 22 }} />
                  </InputAdornment>
                ),
              }}
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
              type="password"
              variant="outlined"
              fullWidth
              error={!!error}
              helperText={error ? error.message : null}
              slotProps={fieldSlotProps}
              sx={{
                mt: isAuthPage ? (isRegisterAuthPage ? { xs: 2, md: 1 } : 2) : 0,
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlinedIcon sx={{ color: 'text.secondary', fontSize: 22 }} />
                  </InputAdornment>
                ),
              }}
            />
          )}
        />
        {!isLoginForm && (
          <Controller
            name="confirmPassword"
            control={control}
            rules={{
              required: t('mandatatory'),
              validate: (v) => v === getValues('password') || t('passwordMismatch'),
            }}
            render={({ field, fieldState: { error } }) => (
              <TextField
                {...field}
                label={t('confirmPassword')}
                type="password"
                variant="outlined"
                fullWidth
                error={!!error}
                helperText={error ? error.message : null}
                slotProps={fieldSlotProps}
                sx={{ mt: { xs: 2, md: 1 } }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon sx={{ color: 'text.secondary', fontSize: 22 }} />
                    </InputAdornment>
                  ),
                }}
              />
            )}
          />
        )}
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
                sx={{ mt: { xs: 2, md: 1 } }}
                placeholder={t('nicknamePlaceholder')}
                error={!!error}
                helperText={error ? error.message : null}
                slotProps={fieldSlotProps}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonOutlineIcon sx={{ color: 'text.secondary', fontSize: 22 }} />
                    </InputAdornment>
                  ),
                }}
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
              <Box sx={{ mt: { xs: 2, md: 1 } }}>
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
          <Box sx={{ mt: { xs: 2, md: 1 }, display: 'flex', flexDirection: 'column', gap: { xs: 1.5, md: 1 } }}>
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
          <Alert
            severity="error"
            sx={{ mb: isRegisterAuthPage ? { xs: 2, md: 1.5 } : 2 }}
            onClose={() => { setAuthError(null); setEmailForResend(''); setResendStatus(null); }}
          >
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
          <Alert severity="success" sx={{ mb: isRegisterAuthPage ? { xs: 2, md: 1.5 } : 2 }}>
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
          {submitLabel}
        </Button>
        {isLoginForm && (
          <Box sx={{ textAlign: 'center', mt: 1.5 }}>
            <MuiLink
              component="button"
              type="button"
              variant="body2"
              onClick={openForgot}
              sx={{ cursor: 'pointer', textDecoration: 'underline', color: 'text.secondary' }}
            >
              {tAuth('forgotPassword')}
            </MuiLink>
          </Box>
        )}
        {googleClientId && (
          <>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                width: '100%',
                my: isRegisterAuthPage ? { xs: 2, md: 1.5 } : 2,
              }}
            >
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
        <Box sx={{ textAlign: 'center', mt: isRegisterAuthPage ? { xs: 2, md: 1.5 } : 2 }}>
          <Typography variant="body2" color="text.secondary" component="span">
            {isLoginForm ? tAuth('footerNoAccount') : tAuth('footerHaveAccount')}{' '}
          </Typography>
          <MuiLink
            component={Link}
            href={isLoginForm ? `${base}/register` : `${base}/login`}
            fontWeight={600}
            underline="hover"
            onClick={() => {
              if (popupMode) closeLoginModal();
            }}
          >
            {isLoginForm ? tAuth('registerNow') : tAuth('loginNow')}
          </MuiLink>
        </Box>
      </form>

      <Dialog open={forgotOpen} onClose={() => setForgotOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{tAuth('forgotTitle')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {tAuth('forgotDescription')}
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label={t('email')}
            type="email"
            fullWidth
            value={forgotEmail}
            onChange={(e) => setForgotEmail(e.target.value)}
            error={!!forgotError && !forgotMessage}
          />
          {forgotError && <Alert severity="error" sx={{ mt: 2 }}>{forgotError}</Alert>}
          {forgotMessage && <Alert severity="success" sx={{ mt: 2 }}>{forgotMessage}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setForgotOpen(false)}>{tAuth('forgotClose')}</Button>
          <Button variant="contained" color="secondary" onClick={submitForgot} disabled={forgotLoading || !!forgotMessage}>
            {forgotLoading ? t('sending') : tAuth('forgotSubmit')}
          </Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}

export default function Form(props) {
  return (
    <Suspense fallback={null}>
      <FormInner {...props} />
    </Suspense>
  );
}
