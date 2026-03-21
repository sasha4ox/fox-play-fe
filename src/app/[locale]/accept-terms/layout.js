import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'AcceptTerms' });
  return { title: t('title') };
}

export default function AcceptTermsLayout({ children }) {
  return children;
}
