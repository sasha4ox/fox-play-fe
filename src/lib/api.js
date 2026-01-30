import { useAuthStore } from '@/store/authStore'

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
 * On 401, clears auth (token invalid / expired) so user is logged out and can re-login.
 */
export async function apiFetch(path, options = {}, token = null) {
  const base = getApiBase()
  const url = path.startsWith('http') ? path : `${base}${path}`
  const headers = { ...getAuthHeaders(token), ...options.headers }
  const res = await fetch(url, { ...options, headers })
  if (res.status === 401 && typeof window !== 'undefined') {
    useAuthStore.getState().logout()
  }
  if (!res.ok) {
    let message = res.status === 401 ? 'Session expired. Please log in again.' : `API error: ${res.status}`
    try {
      const body = await res.json()
      message = body?.message ?? body?.error?.message ?? message
    } catch (_) {}
    const err = new Error(message)
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

/** My offers as seller (auth required) */
export async function getMyOffers(token) {
  return apiGet('/offers/me', token)
}

/** Pre-order messages with seller (auth required). threadBuyerId = when seller views one thread. */
export async function getOfferMessages(offerId, token, threadBuyerId = null) {
  const q = threadBuyerId ? `?buyerId=${encodeURIComponent(threadBuyerId)}` : ''
  return apiGet(`/offers/${offerId}/messages${q}`, token)
}

/** Send message to seller on offer page (auth required). body: { text, buyerId? } (buyerId when seller replies). */
export async function sendOfferMessage(offerId, body, token) {
  return apiPost(`/offers/${offerId}/messages`, body, token)
}

/** My offer threads (pre-order conversations) for Chats page (auth required). */
export async function getMyOfferThreads(token) {
  return apiGet('/offers/me/threads', token)
}

/** Create offer (auth required – pass token) */
export async function createOffer(body, token) {
  return apiPost('/offers', body, token)
}

/** Update offer (auth required) */
export async function updateOffer(offerId, body, token) {
  return apiPut(`/offers/${offerId}`, body, token)
}

/** Create order / buy (auth required). body: { offerId, quantity, characterNick } */
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

/** Deposit info for MVP – Binance (auth required). When mock: true, use simulateDeposit for dev. */
export async function getDepositInfo(token) {
  return apiGet('/me/deposit', token)
}

/** Mock deposit: credit balance (dev only, when backend returns depositInfo.mock) */
export async function simulateDeposit(token) {
  return apiPost('/me/deposit/simulate', {}, token)
}

/** Create deposit order. Binance: returns { checkoutUrl }. WhiteBIT: pass provider: 'whitebit', currency: 'UAH' (or USD/EUR), returns { depositUrl }. Redirect user to the URL. */
export async function createDepositOrder({ amount, returnUrl, cancelUrl, provider, currency }, token) {
  const body = { amount, returnUrl, cancelUrl }
  if (provider) body.provider = provider
  if (currency) body.currency = currency
  return apiPost('/me/deposit/create', body, token)
}

/** My orders as buyer (auth required) */
export async function getMyOrdersAsBuyer(token) {
  return apiGet('/orders/me/buyer', token)
}

/** My orders as seller (auth required) */
export async function getMyOrdersAsSeller(token) {
  return apiGet('/orders/me/seller', token)
}

/** Single order (auth required) */
export async function getOrderById(orderId, token) {
  return apiGet(`/orders/${orderId}`, token)
}

/** Seller: mark order as delivered with proof image(s) (auth required). body: FormData with 'files' (required) */
export async function markOrderDelivered(orderId, formData, token) {
  const base = getApiBase()
  const res = await fetch(`${base}/orders/${orderId}/deliver`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
  if (res.status === 401 && typeof window !== 'undefined') useAuthStore.getState().logout()
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.message || `API error: ${res.status}`)
  }
  return res.json()
}

/** Buyer: confirm order completed – releases payment to seller (auth required) */
export async function completeOrder(orderId, token) {
  return apiPost(`/orders/${orderId}/complete`, {}, token)
}

/** Buyer: open dispute with reason + evidence image(s) (auth required). body: FormData with 'reason' and 'files' */
export async function openDispute(orderId, formData, token) {
  const base = getApiBase()
  const res = await fetch(`${base}/disputes/orders/${orderId}/dispute`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
  if (res.status === 401 && typeof window !== 'undefined') useAuthStore.getState().logout()
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.message || `API error: ${res.status}`)
  }
  return res.json()
}

/** Order messages (auth required) */
export async function getOrderMessages(orderId, token) {
  return apiGet(`/messages/orders/${orderId}/messages`, token)
}

/** Send order message with optional images (auth required). body: FormData with 'text' and optional 'files' (FileList or File[]) */
export async function sendOrderMessage(orderId, formData, token) {
  const base = getApiBase()
  const headers = { Authorization: `Bearer ${token}` }
  const res = await fetch(`${base}/messages/orders/${orderId}/messages`, {
    method: 'POST',
    headers,
    body: formData,
  })
  if (res.status === 401 && typeof window !== 'undefined') {
    useAuthStore.getState().logout()
  }
  if (!res.ok) {
    let message = `API error: ${res.status}`
    try {
      const body = await res.json()
      message = body?.message ?? body?.error?.message ?? message
    } catch (_) {}
    const err = new Error(message)
    err.status = res.status
    err.response = res
    throw err
  }
  return res.json()
}
