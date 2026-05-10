// Skill tree topology — defines node positions, tiers, and prerequisites.
// Phase 1: progression is visualized but everything is unlocked so users
// can wander freely. Phase 2 wires real prerequisites + boss gates.

export const TREE_NODES = [
  // Tier 1 — Foundation (unlocked from start)
  { id: 'sum',     tier: 1, col: 0, prereqs: [], badge: 'first_cup' },
  { id: 'if',      tier: 1, col: 2, prereqs: [], badge: null },

  // Mid-game boss placeholder (Phase 3 will activate it)
  { id: 'boss_auntie_noi', tier: 2, col: 1, prereqs: ['sum', 'if'], type: 'boss', label: 'Auntie Noi' },

  // Tier 3 — Combinations + lookup
  { id: 'sumif',   tier: 3, col: 0, prereqs: ['boss_auntie_noi'], badge: 'manager' },
  { id: 'countif', tier: 3, col: 1, prereqs: ['boss_auntie_noi'], badge: 'manager' },
  { id: 'vlookup', tier: 3, col: 2, prereqs: ['boss_auntie_noi'], badge: 'detective' },

  // Tier 4 — Mastery
  { id: 'iferror', tier: 4, col: 1, prereqs: ['sumif', 'countif', 'vlookup'], badge: 'error_buster' },

  // Final boss placeholder
  { id: 'boss_inspector', tier: 5, col: 1, prereqs: ['iferror'], type: 'boss', label: 'The Inspector' },
]

// Phase 1 stub: everything is reachable
export function isUnlocked(_nodeId, _progress) {
  return true
}

// Phase 2+ will read progress and apply prereqs:
// export function isUnlocked(nodeId, progress) {
//   const node = TREE_NODES.find(n => n.id === nodeId)
//   if (!node) return false
//   return node.prereqs.every(pre => progress[pre]?.completed)
// }
