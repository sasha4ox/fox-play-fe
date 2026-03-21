import { getTranslations } from 'next-intl/server';
import AuthPageClient from '@/components/Auth/AuthPageClient';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'AuthPage' });
  return {
    title: t('registerTitle'),
    description: t('registerDescription'),
  };
}

export default function RegisterPage() {
  return <AuthPageClient mode="register" />;
}
