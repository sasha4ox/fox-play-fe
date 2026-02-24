import { NextResponse } from 'next/server';
import { APP_URL } from '@/lib/env';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = body?.email;
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ message: 'Email is required' }, { status: 400 });
  }
  const backendRes = await fetch(`${APP_URL}/auth/resend-activation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim() }),
  });
  const data = await backendRes.json();
  if (!backendRes.ok) {
    return NextResponse.json(
      { message: data?.error?.message ?? data?.message ?? 'Failed to resend' },
      { status: backendRes.status }
    );
  }
  return NextResponse.json(data);
}
