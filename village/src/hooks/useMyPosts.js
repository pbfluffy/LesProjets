import { useLocalStorage } from './useLocalStorage'

// No sign-in for now: a post "belongs" to the device that created it. Its id
// is remembered here, and only that device shows Edit / Delete. This is a UI
// convenience, not security — firestore.rules can't tell posters apart.
export function useMyPosts() {
  const [ids, setIds] = useLocalStorage('village_my_posts', [])
  const mine = new Set(ids)
  return {
    isMine: (id) => mine.has(id),
    addMine: (id) => setIds((prev) => (prev.includes(id) ? prev : [...prev, id])),
    removeMine: (id) => setIds((prev) => prev.filter((x) => x !== id)),
  }
}
