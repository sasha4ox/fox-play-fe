/**
 * Helpers to get game/variant/server from the tree returned by the BE API.
 * Tree shape: { games: [ { id, name, structureType, variants: [ { id, name, servers: [ { id, name, enabledOfferTypes } ] } ] } ] }
 * Path segments accept either entity UUID or URL slug (slugified name).
 */

/** @param {string} [name] */
export function slugFromName(name) {
  return String(name ?? '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** True if string looks like a UUID (offer id, legacy path segments). */
export function isUuidSegment(s) {
  return typeof s === 'string' && UUID_RE.test(s.trim())
}

function entitySegmentMatches(entity, segment) {
  if (!entity || segment == null || segment === '') return false
  const seg = String(segment)
  if (entity.id === seg) return true
  return slugFromName(entity.name) === seg.toLowerCase()
}

export function getGameFromTree(tree, gameSegment) {
  if (!tree?.games || gameSegment == null || gameSegment === '') return null
  return tree.games.find((g) => entitySegmentMatches(g, gameSegment)) ?? null
}

export function getVariantFromTree(tree, gameSegment, variantSegment) {
  const game = getGameFromTree(tree, gameSegment)
  if (!game?.variants || variantSegment == null || variantSegment === '') return null
  return game.variants.find((v) => entitySegmentMatches(v, variantSegment)) ?? null
}

export function getServerFromTree(tree, gameSegment, variantSegment, serverSegment) {
  const variant = getVariantFromTree(tree, gameSegment, variantSegment)
  if (!variant?.servers || serverSegment == null || serverSegment === '') return null
  return variant.servers.find((s) => entitySegmentMatches(s, serverSegment)) ?? null
}

/** Slug for URL path (same rules as lookup). */
export function getGamePathSegment(game) {
  return slugFromName(game?.name)
}

export function getVariantPathSegment(variant) {
  return slugFromName(variant?.name)
}

export function getServerPathSegment(server) {
  return slugFromName(server?.name)
}

/**
 * @param {string} locale
 * @param {object} game
 * @param {object} [variant]
 * @param {object} [server]
 * @param {string} [categorySlug] - e.g. adena; omit for path ending at /offers (redirect target may add category)
 */
export function pathGameVariantServer(locale, game, variant, server, categorySlug) {
  const g = getGamePathSegment(game)
  const v = getVariantPathSegment(variant)
  const s = getServerPathSegment(server)
  const base = `/${locale}/game/${g}/${v}/${s}/offers`
  if (categorySlug != null && categorySlug !== '') {
    return `${base}/${String(categorySlug).toLowerCase()}`
  }
  return base
}

/** Standard offer types that map to lowercase URL slugs (adena, coins, …). */
export const STANDARD_OFFER_TYPES = ['ADENA', 'COINS', 'ITEMS', 'ACCOUNTS', 'BOOSTING', 'OTHER']

/** Map ADENA → adena */
export function offerTypeToSlug(offerType) {
  return String(offerType ?? '').toLowerCase()
}

/** Map adena → ADENA, or null if not a standard type slug */
export function categorySlugToStandardOfferType(slug) {
  const u = String(slug ?? '').toUpperCase()
  return STANDARD_OFFER_TYPES.includes(u) ? u : null
}

/**
 * Resolve URL category segment to API filter: standard OfferType or custom category id.
 * @param {string} slug
 * @param {{ customCategories?: { id: string, name: string }[] } | null} server
 * @returns {string | null}
 */
export function categorySlugToFilterValue(slug, server) {
  if (slug == null || slug === '') return null
  const std = categorySlugToStandardOfferType(slug)
  if (std) return std
  const custom = (server?.customCategories ?? []).find(
    (c) => slugFromName(c.name) === String(slug).toLowerCase()
  )
  return custom?.id ?? null
}

/** Allowed offer type strings / custom category ids for a server (matches offers list UI). */
export function getAllowedOfferTypesForServer(server) {
  const STANDARD_NAMES = new Set(['adena', 'coins', 'items', 'accounts', 'boosting', 'other'])
  if (!server) return [...STANDARD_OFFER_TYPES]
  const serverTypes = server.enabledOfferTypes?.length ? server.enabledOfferTypes : null
  const customOnly = (server.customCategories ?? []).filter(
    (c) => !STANDARD_NAMES.has(c.name.toLowerCase())
  )
  return serverTypes ?? [...STANDARD_OFFER_TYPES, ...customOnly.map((c) => c.id)]
}

/** Map API filter value (ADENA or custom category id) to URL segment. */
export function filterValueToCategorySlug(filterValue, server) {
  if (filterValue == null || filterValue === '') return 'adena'
  const s = String(filterValue)
  if (STANDARD_OFFER_TYPES.includes(s.toUpperCase())) {
    return offerTypeToSlug(s)
  }
  const custom = (server?.customCategories ?? []).find((c) => c.id === s)
  if (custom) return slugFromName(custom.name)
  return 'adena'
}

/**
 * Default list URL slug for a server (first allowed category).
 * @param {string[] | null} allowedOfferTypes - from server.enabledOfferTypes or derived
 * @param {{ customCategories?: { id: string, name: string }[] } | null} server
 */
export function getDefaultCategorySlug(allowedOfferTypes, server) {
  const types = allowedOfferTypes?.length
    ? allowedOfferTypes
    : [...STANDARD_OFFER_TYPES, ...(server?.customCategories ?? []).map((c) => c.id)]
  const first = types[0]
  if (!first) return 'adena'
  return filterValueToCategorySlug(first, server)
}

/** Full path to offer detail (segment is offer UUID). */
export function pathToOfferDetail(locale, game, variant, server, offerId) {
  const g = getGamePathSegment(game)
  const v = getVariantPathSegment(variant)
  const s = getServerPathSegment(server)
  return `/${locale}/game/${g}/${v}/${s}/offers/${offerId}`
}

/** Checkout (buy flow) for an offer; `offerId` is UUID segment. */
export function pathToOfferCheckout(locale, game, variant, server, offerId) {
  return `${pathToOfferDetail(locale, game, variant, server, offerId)}/checkout`
}

/** Path to edit offer. */
export function pathToOfferEdit(locale, game, variant, server, offerId) {
  return `${pathToOfferDetail(locale, game, variant, server, offerId)}/edit`
}

/** True if game uses SIMPLE structure (game only, no variant/server picker). Includes legacy FLAT. */
export function isSimpleGame(game) {
  return game?.structureType === 'SIMPLE' || game?.structureType === 'FLAT'
}

/** True if game uses VARIANT_ONLY structure (variants, no servers). */
export function isVariantOnlyGame(game) {
  return game?.structureType === 'VARIANT_ONLY'
}

/** For SIMPLE games: returns { variantId, serverId } for direct redirect to offers (uses default variant+server). */
export function getDirectOfferTarget(game) {
  if (!game || !isSimpleGame(game) || !game.variants?.length) return null
  const variant = game.variants[0]
  if (!variant?.servers?.length) return null
  const server = variant.servers[0]
  return { variantId: variant.id, serverId: server.id }
}

/** @deprecated Use getDirectOfferTarget */
export function getFlatGameOfferTarget(game) {
  return getDirectOfferTarget(game)
}

const DEFAULT_GAME_IMAGE = '/images/games/default.png'

/** Supported game image extensions (priority order). Prefer PNG first to avoid 404s when WebP is missing; add WebP assets for better delivery. */
const GAME_IMAGE_EXTENSIONS = ['png', 'webp', 'jpg', 'jpeg']

/**
 * Returns candidate image URLs to try in order: use imageUrl from DB if set (single candidate),
 * else one URL per supported extension for /images/games/{slug}.{ext}, else default.
 * Enables fallback so e.g. .webp is tried first, then .png, then .jpg.
 */
export function getGameImageCandidateUrls(game) {
  if (game?.imageUrl?.trim()) return [game.imageUrl]
  const slug = slugFromName(game?.name)
  if (slug) return GAME_IMAGE_EXTENSIONS.map((ext) => `/images/games/${slug}.${ext}`)
  return [DEFAULT_GAME_IMAGE]
}

/** Resolve game image URL: first candidate from getGameImageCandidateUrls (prefers WebP, then PNG, JPG). */
export function getGameImageUrl(game) {
  return getGameImageCandidateUrls(game)[0]
}

export { DEFAULT_GAME_IMAGE }
