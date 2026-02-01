/**
 * Backend API base URL for server-side calls (e.g. API routes proxying auth).
 * - In production (NODE_ENV=production): use NEXT_PUBLIC_APP_URL (Railway backend).
 * - In development: use NEXT_PUBLIC_LOCAL_APP_URL or localhost:8080 (local backend).
 */
const isDev = process.env.NODE_ENV === 'development'
export const APP_URL = isDev
  ? (process.env.NEXT_PUBLIC_LOCAL_APP_URL || 'http://localhost:8080')
  : (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080')