import { useAuthStore } from '@/store/authStore'

export const getApiBase = () =>
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

const HTML_INSTEAD_OF_JSON_MESSAGE =
  'Server returned HTML instead of JSON. Check that NEXT_PUBLIC_API_URL points to the API server.'

/**
 * Parse response body as JSON. Throws a clear error if the body looks like HTML (e.g. wrong API URL).
 * @param {Response} res
 * @returns {Promise<unknown>}
 */
async function parseJsonResponse(res) {
  if (res.status === 204) return null
  const text = await res.text()
  const trimmed = text.trimStart()
  if (trimmed.startsWith('<')) {
    throw new Error(HTML_INSTEAD_OF_JSON_MESSAGE)
  }
  try {
    return JSON.parse(text)
  } catch (_) {
    throw new Error(HTML_INSTEAD_OF_JSON_MESSAGE)
  }
}

/**
 * Fetch with optional auth. For client components, pass token from useAuthStore.getState().token
 * On 401, clears auth (token invalid / expired) so user is logged out and can re-login.
 */
export async function apiFetch(path, options = {}, token = null) {
  const base = getApiBase()
  const url = path.startsWith('http') ? path : `${base}${path}`
  const reqId =
    (options.headers && options.headers['x-request-id']) ||
    (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2))
  const headers = { ...getAuthHeaders(token), 'x-request-id': reqId, ...options.headers }
  const res = await fetch(url, { ...options, headers })
  if (res.status === 401 && typeof window !== 'undefined') {
    useAuthStore.getState().logout()
  }
  if (!res.ok) {
    let message = res.status === 401 ? 'Session expired. Please log in again.' : `API error: ${res.status}`
    let body = {}
    const text = await res.text()
    if (!text.trimStart().startsWith('<')) {
      try {
        body = JSON.parse(text)
        message = body?.message ?? body?.error?.message ?? message
      } catch (_) {}
    }
    if (res.status === 403 && body?.error?.code === 'ACCOUNT_RESTRICTED' && typeof window !== 'undefined') {
      useAuthStore.getState().logout()
      try {
        sessionStorage.setItem('accountRestrictedMessage', message)
      } catch (_) {}
    }
    const err = new Error(message)
    err.status = res.status
    err.code = body?.error?.code
    err.response = res
    throw err
  }
  return res
}

export async function apiGet(path, token = null) {
  const res = await apiFetch(path, { method: 'GET' }, token)
  return parseJsonResponse(res)
}

export async function apiPost(path, body, token = null) {
  const res = await apiFetch(path, { method: 'POST', body: JSON.stringify(body) }, token)
  return parseJsonResponse(res)
}

export async function apiPut(path, body, token = null) {
  const res = await apiFetch(path, { method: 'PUT', body: JSON.stringify(body) }, token)
  return parseJsonResponse(res)
}

export async function apiPatch(path, body, token = null) {
  const res = await apiFetch(path, { method: 'PATCH', body: JSON.stringify(body) }, token)
  return parseJsonResponse(res)
}

export async function apiDelete(path, token = null) {
  const res = await apiFetch(path, { method: 'DELETE' }, token)
  return parseJsonResponse(res)
}

/** Public request (no auth) - e.g. games tree */
export async function fetchGamesTree() {
  const base = getApiBase()
  const res = await fetch(`${base}/games`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Games API error: ${res.status}`)
  return parseJsonResponse(res)
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

/** Buyer: send first message and open chat – creates inquiry order, adds message, returns { orderId, message }. Redirect to /dashboard/orders/orderId. */
export async function startOfferChat(offerId, body, token) {
  return apiPost(`/offers/${offerId}/start-chat`, body, token)
}

/** Buyer: get inquiry order id for this offer (null if none). */
export async function getOfferInquiryOrderId(offerId, token) {
  return apiGet(`/offers/${offerId}/inquiry-order`, token)
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

/** Delete offer (auth required; seller or admin/moderator) */
export async function deleteOffer(offerId, token) {
  return apiDelete(`/offers/${offerId}`, token)
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

/** Public: whether crypto payment (Pay with Crypto) is enabled for users */
export async function getCryptoPaymentEnabled() {
  const res = await apiFetch('/settings/crypto-payment-enabled', { method: 'GET' }, null)
  const data = await res.json()
  return data?.cryptoPaymentEnabled === true
}

/** Public: whether IBAN payment (Pay via IBAN) is enabled for users */
export async function getIbanPaymentEnabled() {
  const res = await apiFetch('/settings/iban-payment-enabled', { method: 'GET' }, null)
  const data = await res.json()
  return data?.ibanPaymentEnabled === true
}

/** Auth: payment methods available for current user by region (UA: card+crypto; Europe: IBAN+crypto; Other: crypto). Returns { cardPaymentEnabled, ibanPaymentEnabled, cryptoPaymentEnabled }. */
export async function getAvailablePaymentMethods(token) {
  if (!token) return { cardPaymentEnabled: false, ibanPaymentEnabled: false, cryptoPaymentEnabled: false }
  const data = await apiGet('/me/available-payment-methods', token)
  return {
    cardPaymentEnabled: data?.cardPaymentEnabled === true,
    ibanPaymentEnabled: data?.ibanPaymentEnabled === true,
    cryptoPaymentEnabled: data?.cryptoPaymentEnabled === true,
  }
}

/** Public: platform fee percent (e.g. 20 for 20%). Used on sell page to show "buyer will pay X + fee". */
export async function getPlatformFeePercent() {
  const res = await apiFetch('/settings/platform-fee-percent', { method: 'GET' }, null)
  const data = await res.json()
  return typeof data?.platformFeePercent === 'number' ? data.platformFeePercent : 20
}

/** Public: order number message config for card-payment page. Returns { visible: boolean, text: string } (text may contain {{orderId}}). */
export async function getCardPaymentOrderNumberMessage() {
  const res = await apiFetch('/settings/card-payment-order-number-message', { method: 'GET' }, null)
  const data = await res.json()
  return { visible: !!data?.visible, text: typeof data?.text === 'string' ? data.text : '' }
}

/** Last 3 low-price offers for same server + type. params: { serverId, offerType?, customCategoryId?, displayCurrency? }. Returns { sellerNickname, quantityKk, pricePer100kk, currency, ... } */
export async function fetchOfferRecentPrices(params, token = null) {
  const q = new URLSearchParams({ serverId: params.serverId })
  if (params.offerType) q.set('offerType', params.offerType)
  if (params.customCategoryId) q.set('customCategoryId', params.customCategoryId)
  if (params.displayCurrency) q.set('displayCurrency', params.displayCurrency)
  return apiGet(`/offers/recent-prices?${q.toString()}`, token)
}

/** Order card payment page data (buyer only). Returns { status, cardNumber?, paymentDeadlineAt, amount, currency, ... } */
export async function getOrderCardPayment(orderId, token) {
  return apiGet(`/orders/${orderId}/card-payment`, token)
}

/** Mark that buyer has sent money to the card (buyer only). body: { last4: string } - last 4 digits of card used */
export async function markOrderCardPaymentSent(orderId, body, token) {
  return apiPost(`/orders/${orderId}/card-payment/sent`, body || {}, token)
}

/** Order crypto payment page data (buyer only). Returns { status, cryptoWalletAddress?, paymentDeadlineAt, amount, currency, ... } */
export async function getOrderCryptoPayment(orderId, token) {
  return apiGet(`/orders/${orderId}/crypto-payment`, token)
}

/** Mark that buyer has sent crypto (buyer only). No body required. */
export async function markOrderCryptoPaymentSent(orderId, token) {
  return apiPost(`/orders/${orderId}/crypto-payment/sent`, {}, token)
}

/** Order IBAN payment page data (buyer only). Returns { status, iban?, bicSwift?, beneficiaryName?, beneficiaryBank?, accountCurrency?, taxId?, legalAddress?, correspondentAccount?, correspondentBank?, paymentReference?, paymentDeadlineAt, amount, currency, ... } */
export async function getOrderIbanPayment(orderId, token) {
  return apiGet(`/orders/${orderId}/iban-payment`, token)
}

/** Mark that buyer has sent IBAN transfer (buyer only). No body required. */
export async function markOrderIbanPaymentSent(orderId, token) {
  return apiPost(`/orders/${orderId}/iban-payment/sent`, {}, token)
}

/** Extend the card payment deadline by another 10 minutes (buyer only). */
export async function extendOrderCardPaymentDeadline(orderId, token) {
  return apiPost(`/orders/${orderId}/card-payment/extend-deadline`, {}, token)
}

/** Extend the crypto payment deadline by another 10 minutes (buyer only). */
export async function extendOrderCryptoPaymentDeadline(orderId, token) {
  return apiPost(`/orders/${orderId}/crypto-payment/extend-deadline`, {}, token)
}

/** Extend the IBAN payment deadline by another 10 minutes (buyer only). */
export async function extendOrderIbanPaymentDeadline(orderId, token) {
  return apiPost(`/orders/${orderId}/iban-payment/extend-deadline`, {}, token)
}

/** Profile: user + balances in preferred currency (auth required) */
export async function getProfile(token) {
  return apiGet('/me', token)
}

/** Feedbacks received by a user (public, for seller reviews). Returns [{ id, rating, comment, createdAt, fromUser: { id, nickname } }] */
export async function getFeedbacksByUserId(userId) {
  return apiGet(`/users/${userId}/feedbacks`, null)
}

/** Public user profile (nickname, rating, avatar). */
export async function getPublicProfile(userId) {
  return apiGet(`/users/profile/${userId}`, null)
}

/** Public list of offers by seller (for user profile page). */
export async function getOffersBySeller(userId, displayCurrency) {
  const q = displayCurrency ? `?displayCurrency=${encodeURIComponent(displayCurrency)}` : ''
  return apiGet(`/offers/by-seller/${userId}${q}`, null)
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

/** Update profile (nickname, avatarUrl, countryCode). body: { nickname?, avatarUrl?, countryCode? } */
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

/** Get 2FA setup (QR + otpauth URI). Returns { qrCodeDataUrl, otpauthUri }. Auth required. */
export async function get2FASetup(token) {
  return apiGet('/me/2fa/setup', token)
}

/** Verify 2FA setup with 6-digit code. Body: { code }. Enables 2FA on success. */
export async function verify2FASetup(code, token) {
  return apiPost('/me/2fa/verify-setup', { code }, token)
}

/** Disable 2FA. Body: { code }. Requires current TOTP code. */
export async function disable2FA(code, token) {
  return apiPost('/me/2fa/disable', { code }, token)
}

/** Disconnect Telegram notifications (clears telegramChatId). */
export async function disconnectTelegram(token) {
  return apiPost('/me/telegram/disconnect', {}, token)
}

/** Request password reset email. No auth. Body: { email }. */
export async function requestPasswordReset(email) {
  return apiPost('/auth/forgot-password', { email }, null)
}

/** Reset password with token from email. No auth. Body: { token, newPassword }. */
export async function resetPasswordWithToken(token, newPassword) {
  return apiPost('/auth/reset-password', { token, newPassword }, null)
}

/** List saved cards (auth required). Returns { items: [{ id, last4, cardHolderName, label, createdAt, cardNumber? }] }. */
export async function getSavedCards(token) {
  return apiGet('/me/saved-cards', token)
}

function withSavedCardLast4(body) {
  if (!body || typeof body !== 'object') return body
  const payload = { ...body }
  if (payload.last4 == null && typeof payload.cardNumber === 'string') {
    const digits = payload.cardNumber.replace(/\D/g, '')
    if (digits.length >= 4) payload.last4 = digits.slice(-4)
  }
  return payload
}

/** Add saved card. Body: { cardNumber, cardHolderName, label?, last4? }. */
export async function addSavedCard(body, token) {
  return apiPost('/me/saved-cards', withSavedCardLast4(body), token)
}

/** Delete saved card by id. */
export async function deleteSavedCard(id, token) {
  return apiDelete(`/me/saved-cards/${id}`, token)
}

/** Update saved card by id. Body: { cardNumber?, cardHolderName?, label?, last4? }. */
export async function updateSavedCard(id, body, token) {
  return apiPatch(`/me/saved-cards/${id}`, withSavedCardLast4(body), token)
}

/** List saved wallets (auth required). Returns { items: [{ id, walletAddress, label, createdAt }] }. */
export async function getSavedWallets(token) {
  return apiGet('/me/saved-wallets', token)
}

/** Add saved wallet. Body: { walletAddress, label? }. */
export async function addSavedWallet(body, token) {
  return apiPost('/me/saved-wallets', body, token)
}

/** Delete saved wallet by id. */
export async function deleteSavedWallet(id, token) {
  return apiDelete(`/me/saved-wallets/${id}`, token)
}

/** Update saved wallet by id. Body: { walletAddress?, label? }. */
export async function updateSavedWallet(id, body, token) {
  return apiPatch(`/me/saved-wallets/${id}`, body, token)
}

/** Withdraw UAH to bank via WhiteBIT. body: { amount, currency: 'UAH', iban, provider: 'whitebit', firstName, lastName, tin }. Optional totpCode for 2FA. */
export async function createWithdraw(body, token, totpCode = null) {
  const payload = totpCode != null ? { ...body, totpCode } : body
  return apiPost('/me/withdraw', payload, token)
}

/** Request payout to card (balance → card). body: { amount, currency, cardNumber, cardHolderName }. Optional totpCode for 2FA. */
export async function createCardPayoutRequest(body, token, totpCode = null) {
  const payload = totpCode != null ? { ...body, totpCode } : body
  return apiPost('/me/card-payout-request', payload, token)
}

/** Request payout in crypto (USDT TRC20). body: { amount, currency, walletAddress } — `amount` is total USD debited from balance (gross); a 3% fee is deducted and the rest is sent to the wallet. Optional totpCode for 2FA. */
export async function createCryptoPayoutRequest(body, token, totpCode = null) {
  const payload = totpCode != null ? { ...body, totpCode } : body
  return apiPost('/me/crypto-payout-request', payload, token)
}

/** Request payout to IBAN (Europe). body: { amount, currency: 'EUR', iban, bicSwift?, beneficiaryName }. Optional totpCode for 2FA. */
export async function createIbanPayoutRequest(body, token, totpCode = null) {
  const payload = totpCode != null ? { ...body, totpCode } : body
  return apiPost('/me/iban-payout-request', payload, token)
}

/** List current user's IBAN payout requests. */
export async function getMyIbanPayoutRequests(token, params = {}) {
  const q = new URLSearchParams()
  if (params.skip != null) q.set('skip', String(params.skip))
  if (params.take != null) q.set('take', String(params.take))
  const s = q.toString()
  return apiGet(`/me/iban-payout-requests${s ? `?${s}` : ''}`, token)
}

/** List current user's crypto payout requests. */
export async function getMyCryptoPayoutRequests(token, params = {}) {
  const q = new URLSearchParams()
  if (params.skip != null) q.set('skip', String(params.skip))
  if (params.take != null) q.set('take', String(params.take))
  const s = q.toString()
  return apiGet(`/me/crypto-payout-requests${s ? `?${s}` : ''}`, token)
}

export async function getMyCardPayoutRequests(token, params = {}) {
  const q = new URLSearchParams()
  if (params.skip != null) q.set('skip', String(params.skip))
  if (params.take != null) q.set('take', String(params.take))
  const s = q.toString()
  return apiGet(`/me/card-payout-requests${s ? `?${s}` : ''}`, token)
}

/** List balance history (sales, refunds, deposits, payout refunds, purchases). Optional currency filters by that currency. */
export async function getBalanceHistory(token, params = {}) {
  const q = new URLSearchParams()
  if (params.skip != null) q.set('skip', String(params.skip))
  if (params.take != null) q.set('take', String(params.take))
  if (params.currency) q.set('currency', params.currency)
  const s = q.toString()
  return apiGet(`/me/balance-history${s ? `?${s}` : ''}`, token)
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

/** Seller: mark order as delivered with optional proof image(s) (auth required). body: FormData with optional 'files' */
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

/** Cancel order (buyer or seller). Refund goes to buyer balance; both receive a message. */
export async function cancelOrder(orderId, token) {
  return apiPost(`/orders/${orderId}/cancel`, {}, token)
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

/** List all orders (order ID, buyer/seller nicknames) for admin. */
export async function getAdminOrders(token, { skip, take } = {}) {
  const params = new URLSearchParams()
  if (skip != null) params.set('skip', String(skip))
  if (take != null) params.set('take', String(take))
  const q = params.toString()
  return apiGet(`/admin/orders${q ? `?${q}` : ''}`, token)
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

/** Single game with variants and servers (for admin game edit page). */
export async function getAdminGame(token, gameId) {
  return apiGet(`/admin/games/${gameId}`, token)
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

/** Admin: user financial history (deposits, purchases, sales, refunds, payouts). params: { skip, take, currency } */
export async function getAdminUserFinancialHistory(userId, token, params = {}) {
  const q = new URLSearchParams()
  if (params.skip != null) q.set('skip', String(params.skip))
  if (params.take != null) q.set('take', String(params.take))
  if (params.currency) q.set('currency', params.currency)
  const s = q.toString()
  return apiGet(`/admin/users/${userId}/financial-history${s ? `?${s}` : ''}`, token)
}

/** Admin: unified transaction log (orders, deposits, withdrawals). Params: skip, take, userId, search. */
export async function getAdminTransactionLog(token, { skip, take, userId, search } = {}) {
  const params = new URLSearchParams()
  if (skip != null) params.set('skip', String(skip))
  if (take != null) params.set('take', String(take))
  if (userId) params.set('userId', userId)
  if (search) params.set('search', search)
  const q = params.toString()
  return apiGet(`/admin/transaction-log${q ? `?${q}` : ''}`, token)
}

/** Admin: single transaction log entry detail with full payment details (card, crypto, IBAN). */
export async function getAdminTransactionLogEntryDetail(token, entryId) {
  return apiGet(`/admin/transaction-log/${encodeURIComponent(entryId)}`, token)
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

/** Admin: get WhiteBIT enabled (deposit + withdraw). One toggle for all WhiteBIT. */
export async function getAdminWhitebitEnabled(token) {
  const data = await apiGet('/admin/settings/whitebit-enabled', token)
  return data?.whitebitEnabled === true
}

/** Admin: set WhiteBIT enabled (deposit + withdraw). */
export async function setAdminWhitebitEnabled(enabled, token) {
  const data = await apiPatch('/admin/settings/whitebit-enabled', { enabled }, token)
  return data?.whitebitEnabled === true
}

export async function getAdminPlatformFeePercent(token) {
  const data = await apiGet('/admin/settings/platform-fee-percent', token)
  return typeof data?.platformFeePercent === 'number' ? data.platformFeePercent : 20
}

export async function setAdminPlatformFeePercent(platformFeePercent, token) {
  const data = await apiPatch('/admin/settings/platform-fee-percent', { platformFeePercent }, token)
  return data?.platformFeePercent
}

/** Admin: get operator wording mode (INDIVIDUAL | COMPANY). */
export async function getAdminOperatorWordingMode(token) {
  const data = await apiGet('/admin/settings/operator-wording-mode', token)
  const raw = data?.operatorWordingMode
  return raw === 'COMPANY' ? 'COMPANY' : 'INDIVIDUAL'
}

/** Admin: set operator wording mode (INDIVIDUAL | COMPANY). */
export async function setAdminOperatorWordingMode(operatorWordingMode, token) {
  const raw = typeof operatorWordingMode === 'string' ? operatorWordingMode.toUpperCase().trim() : ''
  const mode = raw === 'COMPANY' ? 'COMPANY' : 'INDIVIDUAL'
  const data = await apiPatch('/admin/settings/operator-wording-mode', { operatorWordingMode: mode }, token)
  const updated = data?.operatorWordingMode
  return updated === 'COMPANY' ? 'COMPANY' : 'INDIVIDUAL'
}

/** Admin: get currency rates and source (Frankfurter, ExchangeRate-API, OpenExchangeRates, fallback, manual). */
export async function getAdminCurrencyRates(token) {
  return apiGet('/admin/settings/currency-rates', token)
}

/** Admin: set manual currency rates (only when source is fallback or manual). ratesPerUsd: { EUR, UAH, RUB } = 1 USD. */
export async function setAdminCurrencyRates(ratesPerUsd, token) {
  return apiPatch('/admin/settings/currency-rates', { ratesPerUsd }, token)
}

/** Admin: get order number message config for card-payment page. */
export async function getAdminCardPaymentOrderNumberMessage(token) {
  return apiGet('/admin/settings/card-payment-order-number-message', token)
}

/** Admin: set order number message (visible: boolean, text: string with {{orderId}} placeholder). */
export async function setAdminCardPaymentOrderNumberMessage({ visible, text }, token) {
  return apiPatch('/admin/settings/card-payment-order-number-message', { visible, text }, token)
}

/** Admin: get crypto payment wallet (USDT TRC20). Empty = Pay with Crypto hidden. */
export async function getAdminCryptoPaymentWallet(token) {
  const data = await apiGet('/admin/settings/crypto-payment-wallet', token)
  return data?.wallet ?? ''
}

/** Admin: set crypto payment wallet. body: { wallet: string } */
export async function setAdminCryptoPaymentWallet({ wallet }, token) {
  const data = await apiPatch('/admin/settings/crypto-payment-wallet', { wallet: wallet || '' }, token)
  return data?.wallet ?? ''
}

/** Admin: get IBAN payment enabled. */
export async function getAdminIbanPaymentEnabled(token) {
  const data = await apiGet('/admin/settings/iban-payment-enabled', token)
  return data?.ibanPaymentEnabled === true
}

/** Admin: set IBAN payment enabled. */
export async function setAdminIbanPaymentEnabled(enabled, token) {
  const data = await apiPatch('/admin/settings/iban-payment-enabled', { enabled }, token)
  return data?.ibanPaymentEnabled === true
}

/** Admin: get IBAN payment config (iban, bicSwift, beneficiaryName, beneficiaryBank, accountCurrency, taxId, legalAddress, correspondentAccount, correspondentBank, paymentReference). */
export async function getAdminIbanPaymentConfig(token) {
  return apiGet('/admin/settings/iban-payment-config', token)
}

/** Admin: set IBAN payment config. body: { iban?, bicSwift?, beneficiaryName?, beneficiaryBank?, accountCurrency?, taxId?, legalAddress?, correspondentAccount?, correspondentBank?, paymentReference? } */
export async function setAdminIbanPaymentConfig(config, token) {
  return apiPatch('/admin/settings/iban-payment-config', config || {}, token)
}

export async function getAdminPlatformProfit(token) {
  return apiGet('/admin/money-flow/platform-profit', token)
}

export async function getAdminCards(token) {
  return apiGet('/admin/cards', token)
}

export async function createAdminCard(body, token) {
  return apiPost('/admin/cards', body, token)
}

export async function updateAdminCard(cardId, body, token) {
  return apiPatch(`/admin/cards/${cardId}`, body, token)
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

/** Admin: count of orders awaiting receipt confirmation (for header badge). */
export async function getAdminPendingReceiptsCount(token) {
  const data = await apiGet('/admin/money-flow/receipts-count', token)
  return typeof data?.count === 'number' ? data.count : 0
}

export async function getAdminPendingPayouts(token) {
  return apiGet('/admin/money-flow/payouts', token)
}

export async function adminConfirmReceipt(orderId, token) {
  return apiPost(`/admin/money-flow/orders/${orderId}/confirm-receipt`, {}, token)
}

export async function adminDeclineReceipt(orderId, token) {
  return apiPost(`/admin/money-flow/orders/${orderId}/decline-receipt`, {}, token)
}

export async function getAdminPendingCryptoReceipts(token) {
  return apiGet('/admin/money-flow/crypto-receipts', token)
}

export async function getAdminPendingCryptoReceiptsCount(token) {
  const data = await apiGet('/admin/money-flow/crypto-receipts-count', token)
  return typeof data?.count === 'number' ? data.count : 0
}

export async function getAdminPendingCryptoPayouts(token) {
  return apiGet('/admin/money-flow/crypto-payouts', token)
}

export async function adminConfirmCryptoReceipt(orderId, token) {
  return apiPost(`/admin/money-flow/orders/${orderId}/confirm-crypto-receipt`, {}, token)
}

export async function adminDeclineCryptoReceipt(orderId, token) {
  return apiPost(`/admin/money-flow/orders/${orderId}/decline-crypto-receipt`, {}, token)
}

export async function adminConfirmCryptoPayout(orderId, token) {
  return apiPost(`/admin/money-flow/orders/${orderId}/confirm-crypto-payout`, {}, token)
}

export async function getAdminPendingIbanReceipts(token) {
  return apiGet('/admin/money-flow/iban-receipts', token)
}

export async function getAdminPendingIbanReceiptsCount(token) {
  const data = await apiGet('/admin/money-flow/iban-receipts-count', token)
  return typeof data?.count === 'number' ? data.count : 0
}

export async function getAdminPendingIbanPayouts(token) {
  return apiGet('/admin/money-flow/iban-payouts', token)
}

export async function adminConfirmIbanReceipt(orderId, token) {
  return apiPost(`/admin/money-flow/orders/${orderId}/confirm-iban-receipt`, {}, token)
}

export async function adminDeclineIbanReceipt(orderId, token) {
  return apiPost(`/admin/money-flow/orders/${orderId}/decline-iban-receipt`, {}, token)
}

export async function adminConfirmIbanPayout(orderId, token) {
  return apiPost(`/admin/money-flow/orders/${orderId}/confirm-iban-payout`, {}, token)
}

export async function getAdminCryptoPayoutRequests(token, params = {}) {
  const q = new URLSearchParams()
  if (params.status) q.set('status', params.status)
  if (params.skip != null) q.set('skip', params.skip)
  if (params.take != null) q.set('take', params.take)
  const s = q.toString()
  return apiGet(`/admin/money-flow/crypto-payout-requests${s ? `?${s}` : ''}`, token)
}

export async function adminCryptoPayoutComplete(id, token) {
  return apiPost(`/admin/money-flow/crypto-payout-requests/${id}/complete`, {}, token)
}

export async function adminCryptoPayoutFail(id, token) {
  return apiPost(`/admin/money-flow/crypto-payout-requests/${id}/fail`, {}, token)
}

/** Admin: get or create support conversation with buyer for order (payment info). Returns { id, orderId, orderLink, messages, ... }. */
export async function adminGetOrCreateContactBuyer(orderId, body, token) {
  return apiPost(`/admin/orders/${orderId}/contact-buyer`, body || {}, token)
}

/** Admin: get existing contact-buyer conversation (404 if none). */
export async function adminGetContactBuyer(orderId, token) {
  return apiGet(`/admin/orders/${orderId}/contact-buyer`, token)
}

/** Admin: send message in contact-buyer conversation. body: { text } */
export async function adminSendContactBuyerMessage(orderId, body, token) {
  return apiPost(`/admin/orders/${orderId}/contact-buyer/messages`, body, token)
}

export async function adminConfirmPayout(orderId, token) {
  return apiPost(`/admin/money-flow/orders/${orderId}/confirm-payout`, {}, token)
}

export async function getAdminCardPayouts(token, params = {}) {
  const q = new URLSearchParams()
  if (params.status) q.set('status', params.status)
  if (params.skip != null) q.set('skip', String(params.skip))
  if (params.take != null) q.set('take', String(params.take))
  const s = q.toString()
  return apiGet(`/admin/money-flow/card-payouts${s ? `?${s}` : ''}`, token)
}

export async function adminCardPayoutComplete(id, token) {
  return apiPost(`/admin/money-flow/card-payouts/${id}/complete`, {}, token)
}

export async function adminCardPayoutFail(id, token) {
  return apiPost(`/admin/money-flow/card-payouts/${id}/fail`, {}, token)
}

/** Resolve dispute. body: { action: 'RELEASE' | 'REFUND' } */
export async function resolveDispute(disputeId, body, token) {
  return apiPost(`/disputes/${disputeId}/resolve`, body, token)
}

// ——— User: support conversations (admin contacted about payment) ———
export async function getMySupportConversations(token) {
  return apiGet('/me/support-conversations', token)
}

export async function getSupportConversation(conversationId, token) {
  return apiGet(`/me/support-conversations/${conversationId}`, token)
}

/** body: { text } */
export async function sendSupportConversationMessage(conversationId, body, token) {
  return apiPost(`/me/support-conversations/${conversationId}/messages`, body, token)
}
