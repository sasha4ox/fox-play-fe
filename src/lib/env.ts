/** Backend API base URL: use NEXT_PUBLIC_APP_URL in production, NEXT_PUBLIC_LOCAL_APP_URL for local dev. */
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_LOCAL_APP_URL || 'http://localhost:8080'