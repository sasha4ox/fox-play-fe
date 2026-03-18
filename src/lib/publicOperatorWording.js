const getApiBase = () => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

/**
 * Public (no auth): operator wording mode for legal pages.
 * Uses `cache: 'no-store'` so admin changes show up immediately.
 */
export async function getPublicOperatorWordingMode() {
  try {
    const res = await fetch(`${getApiBase()}/settings/operator-wording-mode`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return 'INDIVIDUAL'
    const data = await res.json()
    const mode = data?.operatorWordingMode
    return mode === 'COMPANY' ? 'COMPANY' : 'INDIVIDUAL'
  } catch {
    return 'INDIVIDUAL'
  }
}

