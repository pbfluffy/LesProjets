// In-progress (unsaved) bills, one per tab, kept in localStorage so a tab
// switch, refresh or accidental back-swipe doesn't throw the bill away.
//   { split: { state, entryId, savedAt }, sushi: { ... } }
// `state` is the same snapshot shape as a saved bill; `entryId` is the saved
// history entry this draft is editing (if any), so saving keeps updating it.
// Drafts older than a day are ignored, so the app doesn't open on a stale bill.
const KEY = 'bill_draft_v1'
const MAX_AGE_MS = 24 * 60 * 60 * 1000

export function readDrafts() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '{}')
    const out = {}
    for (const tab of ['split', 'sushi']) {
      const d = parsed?.[tab]
      if (d && d.state && typeof d.state === 'object' && Date.now() - (d.savedAt || 0) < MAX_AGE_MS) out[tab] = d
    }
    return out
  } catch {
    return {}
  }
}

export function writeDrafts(drafts) {
  try {
    if (Object.keys(drafts).length === 0) localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, JSON.stringify(drafts))
  } catch {
    /* storage full/blocked — drafts are best-effort */
  }
}

// A bill with nothing meaningful typed yet isn't worth restoring.
export function isEmptyDraft(tab, s) {
  if (tab === 'sushi') return !(s.people?.length)
  // one member alone is just the signed-in user's name auto-added to a new bill
  return !(s.foods?.length) && !(s.billName || '').trim() && (s.members?.length ?? 0) <= 1
}
