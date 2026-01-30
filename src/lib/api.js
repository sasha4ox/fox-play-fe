const getApiBase = () =>
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

/**
 * Get headers for API requests. Pass token from useAuthStore.getState().token for authenticated calls.
 * @param {string | null} [token]
 * @returns {Record<string, string>}
 */
export function getAuthHeaders(token = null) {
  const headers = { Accept: 'application/json', 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

/**
 * Fetch with optional auth. For client components, pass token from useAuthStore.getState().token
 */
export async function apiFetch(path, options = {}, token = null) {
  const base = getApiBase()
  const url = path.startsWith('http') ? path : `${base}${path}`
  const headers = { ...getAuthHeaders(token), ...options.headers }
  const res = await fetch(url, { ...options, headers })
  if (!res.ok) {
    const err = new Error(`API error: ${res.status}`)
    err.status = res.status
    err.response = res
    throw err
  }
  return res
}

export async function apiGet(path, token = null) {
  const res = await apiFetch(path, { method: 'GET' }, token)
  return res.json()
}

export async function apiPost(path, body, token = null) {
  const res = await apiFetch(path, { method: 'POST', body: JSON.stringify(body) }, token)
  return res.json()
}

export async function apiPut(path, body, token = null) {
  const res = await apiFetch(path, { method: 'PUT', body: JSON.stringify(body) }, token)
  return res.json()
}

export async function apiPatch(path, body, token = null) {
  const res = await apiFetch(path, { method: 'PATCH', body: JSON.stringify(body) }, token)
  return res.json()
}

export async function apiDelete(path, token = null) {
  const res = await apiFetch(path, { method: 'DELETE' }, token)
  if (res.status === 204) return null
  return res.json()
}

/** Public request (no auth) - e.g. games tree */
export async function fetchGamesTree() {
  const base = getApiBase()
  const res = await fetch(`${base}/games`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Games API error: ${res.status}`)
  return res.json()
}

/** Offers by server (public) */
export async function fetchOffersByServer(serverId) {
  return apiGet(`/offers?serverId=${serverId}`)
}

/** Single offer (public) */
export async function fetchOfferById(offerId) {
  return apiGet(`/offers/${offerId}`)
}

/** Create offer (auth required – pass token) */
export async function createOffer(body, token) {
  return apiPost('/offers', body, token)
}

/** Update offer (auth required) */
export async function updateOffer(offerId, body, token) {
  return apiPut(`/offers/${offerId}`, body, token)
}

/** Create order / buy (auth required) */
export async function createOrder(body, token) {
  return apiPost('/orders', body, token)
}

/** Profile: user + balances in preferred currency (auth required) */
export async function getProfile(token) {
  return apiGet('/me', token)
}

/** Update preferred currency (auth required) */
export async function updatePreferredCurrency(currency, token) {
  return apiPatch('/me', { preferredCurrency: currency }, token)
}

/** Deposit info for MVP – Binance (auth required) */
export async function getDepositInfo(token) {
  return apiGet('/me/deposit', token)
}
