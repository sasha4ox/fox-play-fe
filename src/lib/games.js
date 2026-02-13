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

/** True if game uses flat structure (no variant/server picker, e.g. Dota, CS2). */
export function isFlatGame(game) {
  return game?.structureType === 'FLAT'
}

/** For FLAT games with exactly 1 variant and 1 server, returns { variantId, serverId } for direct redirect to offers. */
export function getFlatGameOfferTarget(game) {
  if (!game || !isFlatGame(game) || !game.variants?.length) return null
  const variant = game.variants[0]
  if (!variant?.servers?.length) return null
  const server = variant.servers[0]
  return { variantId: variant.id, serverId: server.id }
}
