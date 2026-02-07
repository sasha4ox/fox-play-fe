import { APP_URL } from '../../../lib/env';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();
  const idToken = (body.credential ?? body.idToken ?? '').trim();
  if (!idToken) {
    return NextResponse.json({ message: 'Google credential is required' }, { status: 400 });
  }

  const thirdPartyResponse = await fetch(`${APP_URL}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  const response = await thirdPartyResponse.json();
  const status = thirdPartyResponse.ok ? 200 : thirdPartyResponse.status;
  const res = NextResponse.json(response, { status });

  if (thirdPartyResponse.ok && response?.token) {
    res.cookies.set('sessionToken', response.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
  }

  return res;
}
