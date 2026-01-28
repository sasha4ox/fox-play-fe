'use client'
import { useState } from 'react';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import { useForm, Controller } from 'react-hook-form';
// import { MuiTelInput } from 'mui-tel-input'
import styles from "./form.module.css";
import TelegramIcon from '@mui/icons-material/Telegram';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { APP_URL } from '../../src/lib/env';
import { redirect } from 'next/navigation';

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

export default function Form() {
  const [isLoginForm, setIsloginForm] = useState(true);
  const { control, handleSubmit, setError, formState: { isSubmitting } } = useForm({
    defaultValues: {
      password: "",
      email: ""
    },
  });
  const locale = useLocale();
  const t = useTranslations('Form');

  const handleChangeForm = () => {
    setIsloginForm(!isLoginForm)
  }
  

  const handleLogin = async (data) => {
    const response = await fetch('/api/login', {
      method: 'post',
      headers: {
      'Content-Type': 'application/json',
        },
      body: JSON.stringify(data),
    });
    const parsedResponse = await response.json();

    if (parsedResponse.response.token) {
      redirect(`${locale}/dashboard`);
    }
  }

  const handleRegister = async (data) => {
    const response = await fetch('/api/register', {
      method: 'post',
      headers: {
      'Content-Type': 'application/json',
        },
      body: JSON.stringify(data),
    });
  }

  const [isEmailSent, setIsEmailSent] = useState(false);
  const onSubmit = async (data) => {
    console.log('APP_URL', APP_URL)
    try {
      if (isLoginForm) {
        handleLogin(data)
      } else {
        handleRegister(data)
      }
      if (response.ok) {
        setIsEmailSent(true)
      }
    } catch (error) {
        setIsEmailSent(false)
        setError("email", { type: "custom", message: "Нажаль, ми не змогли відправити запит!" })
    }

  } 

  return (
    <section className={styles.formWrapper}>
      <h1>{locale}</h1>
      <h2>{isLoginForm ? "Логін" : "Реєстрація"}</h2>
      <span className={styles.formHeader}>{t('header')}</span>
      {/* <div className={styles.links}>
        <a href="https://t.me/KonungFox" target="_blank"  className={styles.link} aria-label="Приєднуйтесь до Telegram">
          <TelegramIcon fontSize='large'/>
        </a>
        <a className={styles.link} href="https://www.facebook.com/" target="_blank" aria-label="Приєднуйтесь до Facebook">
          <FacebookIcon fontSize='large'/>
        </a>
        <a className={styles.link} href="https://www.instagram.com/" target="_blank" aria-label="Приєднуйтесь до Instagram">
          <InstagramIcon fontSize='large'/>
        </a>
      </div> */}
      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        <Controller
          name="email"
          control={control}
          rules={{
          required: t('mandatatory'),
          pattern: {
            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            message: "Введіть коректну email адресу",
          },
        }}
          render={({ field, fieldState: { error } }) => (
              <TextField
                  {...field}
                  label="Ваш e-mail"
                  variant="outlined"
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
                  label="Пароль"
                  type={"password"}
                  variant="outlined"
                  error={!!error}
                  helperText={error ? error.message : null}
              />
          )}
        />
        {isEmailSent && <Alert severity="success" sx={{ mb: 2 }}>
    ✅    Запит успішно надіслано! Ми звʼяжемося з вами найближчим часом.
        </Alert>}
        <button type="submit" className={styles.send}>{isSubmitting ? "Надсилаю запит" : "Надіслати запит"}</button>
        <div onClick={handleChangeForm}>{isLoginForm ? "Не має акаунту" : "В мене є акаунт"}</div>
        
      </form>
    </section>
  );
}
