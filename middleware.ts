import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';

const intlMiddleware = createMiddleware({
  locales: ['en', 'ua'],
  defaultLocale: 'en'
});

/** Fix bad redirects like /ua/en/dashboard/... -> /ua/dashboard/... */
export default function middleware(request) {
  const pathname = request.nextUrl.pathname;
  const badMatch = pathname.match(/^\/(en|ua)\/(en|ua)(\/.*|$)/);
  if (badMatch) {
    const locale = badMatch[1];
    const rest = badMatch[3] || '/';
    const newPath = `/${locale}${rest === '/' ? '' : rest}`;
    const url = new URL(request.url);
    url.pathname = newPath;
    return NextResponse.redirect(url);
  }
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    '/',                // root
    '/(en|ua)',         // locale root
    '/(en|ua)/:path*'   // locale sub-routes
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