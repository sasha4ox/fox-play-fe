import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  locales: ['en', 'ua'],
  defaultLocale: 'en'
});

// 👇 THIS is the important part
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