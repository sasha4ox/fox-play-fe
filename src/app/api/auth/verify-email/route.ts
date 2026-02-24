import { NextResponse } from 'next/server';
import { APP_URL } from '@/lib/env';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }
  const backendRes = await fetch(`${APP_URL}/auth/verify-email?token=${encodeURIComponent(token)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  const data = await backendRes.json();

  if (!backendRes.ok) {
    return NextResponse.json(
      { error: data?.error?.message ?? data?.message ?? 'Verification failed' },
      { status: backendRes.status }
    );
  }

  const res = NextResponse.json({ success: true, user: data.user, token: data.token });
  if (data.token) {
    res.cookies.set('sessionToken', data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
  }
  return res;
}
