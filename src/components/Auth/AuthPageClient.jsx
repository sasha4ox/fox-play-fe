'use client';

import AuthPageLayout from '@/components/Auth/AuthPageLayout';
import Form from '@/components/Form/Form';

export default function AuthPageClient({ mode }) {
  return (
    <AuthPageLayout>
      <Form mode={mode} />
    </AuthPageLayout>
  );
}
