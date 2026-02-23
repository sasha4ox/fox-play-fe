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
    let body = {}
    try {
      body = await res.json()
      message = body?.message ?? body?.error?.message ?? message
    } catch (_) {}
    if (res.status === 403 && body?.code === 'ACCOUNT_RESTRICTED' && typeof window !== 'undefined') {
      useAuthStore.getState().logout()
      try {
        sessionStorage.setItem('accountRestrictedMessage', message)
      } catch (_) {}
    }
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

/** Offers by server. Pass token when logged in to get displayPrice in your currency. For guests, pass displayCurrency (e.g. 'USD'). params: { offerType, priceMin, priceMax, displayCurrency } */
export async function fetchOffersByServer(serverId, token = null, params = {}) {
  const q = new URLSearchParams({ serverId })
  if (params.offerType) q.set('offerType', params.offerType)
  if (params.priceMin != null) q.set('priceMin', String(params.priceMin))
  if (params.priceMax != null) q.set('priceMax', String(params.priceMax))
  if (params.displayCurrency) q.set('displayCurrency', params.displayCurrency)
  return apiGet(`/offers?${q.toString()}`, token)
}

/** Single offer. Pass token when logged in to get displayPrice in your currency. For guests, pass options.displayCurrency (e.g. 'USD'). */
export async function fetchOfferById(offerId, token = null, options = {}) {
  const q = options.displayCurrency ? `?displayCurrency=${encodeURIComponent(options.displayCurrency)}` : ''
  return apiGet(`/offers/${offerId}${q}`, token)
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

/** Create order / buy (auth required). body: { offerId, quantity, characterNick, paymentMethod? } (paymentMethod: 'CARD_MANUAL' for pay by card) */
export async function createOrder(body, token) {
  return apiPost('/orders', body, token)
}

/** Public: whether card payment option is enabled for users */
export async function getCardPaymentEnabled() {
  const res = await apiFetch('/settings/card-payment-enabled', { method: 'GET' }, null)
  const data = await res.json()
  return data?.cardPaymentEnabled === true
}

/** Order card payment page data (buyer only). Returns { status, cardNumber?, paymentDeadlineAt, amount, currency, ... } */
export async function getOrderCardPayment(orderId, token) {
  return apiGet(`/orders/${orderId}/card-payment`, token)
}

/** Mark that buyer has sent money to the card (buyer only) */
export async function markOrderCardPaymentSent(orderId, token) {
  return apiPost(`/orders/${orderId}/card-payment/sent`, {}, token)
}

/** Profile: user + balances in preferred currency (auth required) */
export async function getProfile(token) {
  return apiGet('/me', token)
}

/** Feedbacks received by a user (public, for seller reviews). Returns [{ id, rating, comment, createdAt, fromUser: { id, nickname } }] */
export async function getFeedbacksByUserId(userId) {
  return apiGet(`/users/${userId}/feedbacks`, null)
}

/** Last 5 servers user viewed offers on (auth required). Returns [{ serverId, gameId, variantId, gameName, variantName, serverName, lastVisited }] */
export async function getRecentServers(token) {
  return apiGet('/me/recent-servers', token)
}

/** Record that user viewed this server's offers (auth required). Keeps last 5. */
export async function addRecentServer(serverId, token) {
  const res = await apiFetch('/me/recent-servers', { method: 'POST', body: JSON.stringify({ serverId }) }, token)
  if (res.status === 204) return
  return res.json()
}

/** Update preferred currency (auth required) */
export async function updatePreferredCurrency(currency, token) {
  return apiPatch('/me', { preferredCurrency: currency }, token)
}

/** Update profile (nickname, avatarUrl). body: { nickname?, avatarUrl? } */
export async function updateProfile(body, token) {
  return apiPatch('/me', body, token)
}

/** Upload avatar image. FormData with 'avatar' file. Returns { avatarUrl } */
export async function uploadAvatar(formData, token) {
  const base = getApiBase()
  const res = await fetch(`${base}/me/avatar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
  if (res.status === 401 && typeof window !== 'undefined') useAuthStore.getState().logout()
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data?.message || `Upload failed: ${res.status}`)
  }
  return res.json()
}

/** Deposit info (auth required). WhiteBIT only. When mock: true, use simulateDeposit for dev. */
export async function getDepositInfo(token) {
  return apiGet('/me/deposit', token)
}

/** Mock deposit: credit balance (dev only, when backend returns depositInfo.mock) */
export async function simulateDeposit(token) {
  return apiPost('/me/deposit/simulate', {}, token)
}

/** Test credit: add 2000 in user's preferred currency (when ALLOW_TEST_CREDIT=true on backend, for testers). */
export async function addTestCredit(token) {
  return apiPost('/me/test-credit', {}, token)
}

/** Create deposit order. WhiteBIT: pass provider: 'whitebit', currency: 'UAH' (or USD/EUR), returns { depositUrl }. Redirect user to the URL. */
export async function createDepositOrder({ amount, returnUrl, cancelUrl, provider, currency }, token) {
  const body = { amount, returnUrl, cancelUrl }
  if (provider) body.provider = provider
  if (currency) body.currency = currency
  return apiPost('/me/deposit/create', body, token)
}

/** Withdraw UAH to bank via WhiteBIT. body: { amount, currency: 'UAH', iban, provider: 'whitebit', firstName, lastName, tin }. Requires WhiteBIT configured. */
export async function createWithdraw(body, token) {
  return apiPost('/me/withdraw', body, token)
}

/** My orders as buyer (auth required) */
export async function getMyOrdersAsBuyer(token) {
  return apiGet('/orders/me/buyer', token)
}

/** My orders as seller (auth required). options.status: filter by status (e.g. 'CREATED' or 'CREATED,PAID') */
export async function getMyOrdersAsSeller(token, options = {}) {
  const params = new URLSearchParams()
  if (options.status) params.set('status', options.status)
  const q = params.toString()
  return apiGet(`/orders/me/seller${q ? `?${q}` : ''}`, token)
}

/** Chats summary: orders with lastMessage, otherParty (avatar), unreadCount, unreadTotal (auth required) */
export async function getMyOrderChats(token) {
  return apiGet('/orders/me/chats', token)
}

/** Unread messages count across all order chats (auth required) */
export async function getUnreadCount(token) {
  return apiGet('/messages/unread-count', token)
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

/** Leave mandatory feedback for the other party (buyer or seller). Auth required. Body: { rating: 1–5, comment?: string } */
export async function leaveOrderFeedback(orderId, body, token) {
  return apiPost(`/orders/${orderId}/feedback`, body, token)
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

// ——— Admin (ADMIN / MODERATOR only) ———

/** Platform stats (users, orders, disputes, offers, deposits). */
export async function getAdminStats(token) {
  return apiGet('/admin/stats', token)
}

/** List disputes with optional status filter (OPEN, RESOLVED, REJECTED). */
export async function getAdminDisputes(token, { status, skip, take } = {}) {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (skip != null) params.set('skip', String(skip))
  if (take != null) params.set('take', String(take))
  const q = params.toString()
  return apiGet(`/admin/disputes${q ? `?${q}` : ''}`, token)
}

/** Full games tree with enabled flags (for admin management). */
export async function getAdminGames(token) {
  return apiGet('/admin/games', token)
}

/** Update game (name, enabled). */
export async function adminUpdateGame(gameId, body, token) {
  return apiPatch(`/admin/games/${gameId}`, body, token)
}

/** Update variant (name, enabled). */
export async function adminUpdateVariant(variantId, body, token) {
  return apiPatch(`/admin/variants/${variantId}`, body, token)
}

/** Update server (name, enabled). */
export async function adminUpdateServer(serverId, body, token) {
  return apiPatch(`/admin/servers/${serverId}`, body, token)
}

/** Create game. body: { name } */
export async function adminCreateGame(body, token) {
  return apiPost('/admin/games', body, token)
}

/** Create variant. body: { name } */
export async function adminCreateVariant(gameId, body, token) {
  return apiPost(`/admin/games/${gameId}/variants`, body, token)
}

/** Create server. body: { name } */
export async function adminCreateServer(gameId, variantId, body, token) {
  return apiPost(`/admin/games/${gameId}/variants/${variantId}/servers`, body, token)
}

/** Create custom category for server. body: { name } */
export async function adminCreateServerCustomCategory(serverId, body, token) {
  return apiPost(`/admin/servers/${serverId}/custom-categories`, body, token)
}

/** Delete custom category */
export async function adminDeleteServerCustomCategory(categoryId, token) {
  return apiFetch(`/admin/servers/custom-categories/${categoryId}`, { method: 'DELETE' }, token)
}

/** List users (admin). query: { skip?, take?, banned?: 'true'|'false' } */
export async function getAdminUsers(token, query = {}) {
  const q = new URLSearchParams()
  if (query.skip != null) q.set('skip', query.skip)
  if (query.take != null) q.set('take', query.take)
  if (query.banned === true || query.banned === 'true') q.set('banned', 'true')
  if (query.banned === false || query.banned === 'false') q.set('banned', 'false')
  const s = q.toString()
  return apiGet(`/admin/users${s ? `?${s}` : ''}`, token)
}

/** Ban user. body: { reason?: string } */
export async function adminBanUser(userId, body, token) {
  return apiPost(`/admin/users/${userId}/ban`, body || {}, token)
}

/** Unban user. */
export async function adminUnbanUser(userId, token) {
  return apiPost(`/admin/users/${userId}/unban`, {}, token)
}

// ——— Admin: Card payment & money flow ———
export async function getAdminCardPaymentEnabled(token) {
  const data = await apiGet('/admin/settings/card-payment-enabled', token)
  return data?.cardPaymentEnabled === true
}

export async function setAdminCardPaymentEnabled(enabled, token) {
  const data = await apiPatch('/admin/settings/card-payment-enabled', { enabled }, token)
  return data?.cardPaymentEnabled === true
}

export async function getAdminCards(token) {
  return apiGet('/admin/cards', token)
}

export async function createAdminCard(body, token) {
  return apiPost('/admin/cards', body, token)
}

export async function setAdminCardActive(cardId, token) {
  return apiPost(`/admin/cards/${cardId}/set-active`, {}, token)
}

export async function deleteAdminCard(cardId, token) {
  const res = await apiFetch(`/admin/cards/${cardId}`, { method: 'DELETE' }, token)
  if (res.ok || res.status === 204) return
  const data = await res.json().catch(() => ({}))
  throw new Error(data?.message || 'Failed to delete card')
}

export async function getAdminPendingReceipts(token) {
  return apiGet('/admin/money-flow/receipts', token)
}

export async function getAdminPendingPayouts(token) {
  return apiGet('/admin/money-flow/payouts', token)
}

export async function adminConfirmReceipt(orderId, token) {
  return apiPost(`/admin/money-flow/orders/${orderId}/confirm-receipt`, {}, token)
}

export async function adminConfirmPayout(orderId, token) {
  return apiPost(`/admin/money-flow/orders/${orderId}/confirm-payout`, {}, token)
}

/** Resolve dispute. body: { action: 'RELEASE' | 'REFUND' } */
export async function resolveDispute(disputeId, body, token) {
  return apiPost(`/disputes/${disputeId}/resolve`, body, token)
}
