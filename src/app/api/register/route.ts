import type { NextApiRequest, NextApiResponse } from 'next';

import { APP_URL } from '../../../lib/env';


import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();
  
  const thirdPartyResponse = await fetch(`${APP_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  const response = await thirdPartyResponse.json();

  return NextResponse.json({
    success: true,
    body
  });
}