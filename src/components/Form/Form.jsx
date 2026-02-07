'use client';

import { useState } from 'react';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useForm, Controller } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { redirect } from 'next/navigation';
import { GoogleLogin } from '@react-oauth/google';
import { useAuthStore } from '@/store/authStore';
import styles from './form.module.css';

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

const conriesToShow = [
                    // EU
                    'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT',
                    'LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE', 'UA',

                    // Major / common world countries
                    'US', // United States
                    'CA', // Canada
                    'GB', // United Kingdom
                    'AU', // Australia
                    'NZ', // New Zealand
                    'JP', // Japan
                    'CN', // China
                    'IN', // India
                    'BR', // Brazil
                    'MX', // Mexico
                    'KR', // South Korea
                    'SG', // Singapore
                    'CH', // Switzerland
                    'NO', // Norway
                    'TR', // Turkey
                    'IL', // Israel
                    'AE', // United Arab Emirates
                    'SA', // Saudi Arabia
                    'ZA'  // South Africa
                    ]

export default function Form({ popupMode = false, onLoginSuccess }) {
  const [isLoginForm, setIsloginForm] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authSuccess, setAuthSuccess] = useState(null);
  const { control, handleSubmit, setError, formState: { isSubmitting } } = useForm({
    defaultValues: {
      password: "",
      email: "",
      nickname: "",
    },
  });
  const locale = useLocale();
  const t = useTranslations('Form');

  const handleChangeForm = () => {
    setAuthError(null);
    setAuthSuccess(null);
    setIsloginForm(!isLoginForm);
  };
  

  const setAuth = useAuthStore((s) => s.setAuth);

  const getAuthErrorMessage = (responseBody) => {
    const msg = responseBody?.error?.message ?? responseBody?.message ?? '';
    if (/invalid credentials/i.test(msg)) return t('invalidCredentials');
    if (/user already exists/i.test(msg)) return t('emailAlreadyRegistered');
    if (/nickname is required/i.test(msg)) return t('nicknameRequired');
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
      setAuthError(getAuthErrorMessage(parsedResponse?.response ?? parsedResponse));
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    const credential = credentialResponse?.credential;
    if (!credential) return;
    setAuthError(null);
    const response = await fetch('/api/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
    });
    const res = await response.json();
    if (response.ok && res?.token) {
      const user = res.user ?? {};
      setAuth(user, res.token);
      setAuthSuccess(t('loginSuccess'));
      if (popupMode && onLoginSuccess) {
        onLoginSuccess();
        return;
      }
      redirect(`/${locale}/dashboard`);
    } else {
      setAuthError(res?.message || getAuthErrorMessage(res));
    }
  };

  const handleGoogleError = () => {
    setAuthError(t('googleSignInError'));
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
    } else {
      setAuthError(getAuthErrorMessage(res));
    }
    return response;
  };

  const [isEmailSent, setIsEmailSent] = useState(false);

  const onSubmit = async (data) => {
    setAuthError(null);
    setAuthSuccess(null);
    try {
      if (isLoginForm) {
        await handleLogin(data);
      } else {
        const response = await handleRegister(data);
        if (response?.ok) setIsEmailSent(true);
      }
    } catch (err) {
      setAuthError(t('errorSubmit'));
      setError('email', { type: 'custom', message: t('errorSubmit') });
    }
  }; 

  return (
    <section className={styles.formWrapper}>
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
        {isEmailSent && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {t('emailSentSuccess')}
          </Alert>
        )}
        {authError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setAuthError(null)}>
            {authError}
          </Alert>
        )}
        {authSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {authSuccess}
          </Alert>
        )}
        <Button type="submit" variant="contained" color="secondary" fullWidth className={styles.send} disabled={isSubmitting}>
          {isSubmitting ? t('sending') : t('submit')}
        </Button>
        {googleClientId && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ my: 1.5, textAlign: 'center' }}>
              {t('or')}
            </Typography>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap={false}
                theme="filled_black"
                size="medium"
                text="continue_with"
                shape="rectangular"
              />
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
