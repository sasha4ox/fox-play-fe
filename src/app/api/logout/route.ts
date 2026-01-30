import { NextResponse } from 'next/server'

/**
 * Clears the sessionToken cookie (set by /api/login).
 * Call this from the client on logout so the backend cookie is cleared.
 */
export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set('sessionToken', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
    path: '/',
  })
  return res
}
