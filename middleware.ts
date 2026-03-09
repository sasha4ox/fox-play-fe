import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';

const intlMiddleware = createMiddleware({
  locales: ['en', 'ua', 'ru', 'es'],
  defaultLocale: 'en',
  alternateLinks: false, // hreflang set in [locale]/layout.js with BCP 47 "uk" for Ukrainian
});

/** Fix bad redirects like /ua/en/dashboard/... -> /ua/dashboard/... */
export default function middleware(request) {
  const pathname = request.nextUrl.pathname;
  const badMatch = pathname.match(/^\/(en|ua|ru|es)\/(en|ua|ru|es)(\/.*|$)/);
  if (badMatch) {
    const locale = badMatch[1];
    const rest = badMatch[3] || '/';
    const newPath = `/${locale}${rest === '/' ? '' : rest}`;
    const url = new URL(request.url);
    url.pathname = newPath;
    return NextResponse.redirect(url);
  }

  // Assign correlation ID: reuse from incoming request or generate a new one
  const reqId = request.headers.get('x-request-id') || crypto.randomUUID();
  const response = intlMiddleware(request);
  response.headers.set('x-request-id', reqId);
  return response;
}

export const config = {
  matcher: [
    '/',                    // root
    '/(en|ua|ru|es)',       // locale root
    '/(en|ua|ru|es)/:path*' // locale sub-routes
  ]
};





// import { NextResponse } from 'next/server';

// export function middleware(req) {
//   console.log('🔥 middleware hit:', req.nextUrl.pathname);
//   return NextResponse.next();
// }

// export const config = {
//   matcher: ['/', '/(en|ua)/:path*']
// };


// middleware.ts
// import { NextResponse } from 'next/server';

// export function middleware(req) {
//   const res = NextResponse.next();
//   res.headers.set('x-middleware-hit', 'true');
//   return res;
// }

// export const config = {
//   matcher: ['/', '/(en|ua)', '/(en|ua)/:path*']
// };

// middleware.ts
// import { NextResponse } from 'next/server';

// export function middleware(request) {
//   const response = NextResponse.next();
//   response.headers.set('x-middleware-hit', 'true');
//   return response;
// }

// export const config = {
//   matcher: ['/', '/(en|ua)', '/(en|ua)/:path*']
// };