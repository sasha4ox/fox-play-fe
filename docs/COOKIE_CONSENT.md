# Cookie Consent (GDPR-compliant)

## Overview

A GDPR-compliant cookie consent popup with category toggles, consent persistence, and conditional script loading.

## Architecture

```
src/
  lib/
    cookieConsent.ts          # Types, storage, config (easy to add categories)
    conditionalScripts.ts     # Helpers for loading scripts on consent
  contexts/
    CookieConsentContext.tsx  # Provider + state
  hooks/
    useCookieConsent.ts      # Hook for consent state
  components/
    CookieConsent/           # Banner UI
    ConditionalAnalytics/   # Example: load analytics only when consented
```

## Usage

### Access consent state

```jsx
import { useCookieConsent } from '@/hooks/useCookieConsent';

function MyComponent() {
  const { consent, hasConsented } = useCookieConsent();
  const canTrack = consent?.analytics ?? false;
  // Load analytics only when canTrack is true
}
```

### Conditional script loading

See `ConditionalAnalytics.jsx` for the pattern. To enable Google Analytics:

1. Add `NEXT_PUBLIC_GA_MEASUREMENT_ID` to `.env`
2. Uncomment the `useEffect` in `ConditionalAnalytics.jsx`

### Reopen consent settings

Users can reopen the consent banner via the "Cookie preferences" link in the footer.

## Adding new cookie categories

1. Edit `src/lib/cookieConsent.ts`:
   - Add the new id to `CookieCategoryId` type
   - Add to `CookieConsentState`
   - Add to `DEFAULT_CONSENT`
   - Add to `COOKIE_CATEGORIES`
2. Add the category to `CATEGORY_IDS` in `CookieConsent.tsx`
3. Add translations for `category_<id>` and `category_<id>_desc` in `en.json` and `ua.json`

## Storage

Consent is stored in `localStorage` under key `cookie_consent`. Structure:

```json
{
  "essential": true,
  "analytics": false,
  "marketing": false,
  "functional": false,
  "timestamp": 1234567890,
  "version": "1"
}
```

## Default state

- **Essential**: always enabled (cannot be disabled)
- **Analytics, Marketing, Functional**: denied by default (GDPR best practice)
