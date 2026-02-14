/**
 * Helpers to get game/variant/server from the tree returned by the BE API.
 * Tree shape: { games: [ { id, name, structureType, variants: [ { id, name, servers: [ { id, name, enabledOfferTypes } ] } ] } ] }
 */

export function getGameFromTree(tree, gameId) {
  if (!tree?.games) return null
  return tree.games.find((g) => g.id === gameId) ?? null
}

export function getVariantFromTree(tree, gameId, variantId) {
  const game = getGameFromTree(tree, gameId)
  if (!game?.variants) return null
  return game.variants.find((v) => v.id === variantId) ?? null
}

export function getServerFromTree(tree, gameId, variantId, serverId) {
  const variant = getVariantFromTree(tree, gameId, variantId)
  if (!variant?.servers) return null
  return variant.servers.find((s) => s.id === serverId) ?? null
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
