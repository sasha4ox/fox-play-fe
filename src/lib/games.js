/**
 * Helpers to get game/variant/server from the tree returned by the BE API.
 * Tree shape: { games: [ { id, name, variants: [ { id, name, servers: [ { id, name } ] } ] } ] }
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
