import type { NextApiRequest, NextApiResponse } from 'next';
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
import { APP_URL } from '../../../../src/lib/env';


import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();

  const thirdPartyResponse = await fetch(`${APP_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const response = await thirdPartyResponse.json();
  const status = thirdPartyResponse.ok ? 200 : thirdPartyResponse.status;
  const res = NextResponse.json({ response }, { status });

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