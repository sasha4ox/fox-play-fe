import { GoogleAnalytics } from '@next/third-parties/google';

/**
 * /auth/* is outside [locale]; locale layout (with Google tag) does not apply here.
 */
export default function AuthLayout({ children }) {
  return (
    <>
      <GoogleAnalytics gaId="AW-778100487" />
      {children}
    </>
  );
}
