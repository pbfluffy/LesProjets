// Mirrors pumgoda's admin pattern (same Firebase project, same owner) — a
// hardcoded owner UID rather than a Firestore-backed /admins collection,
// since this app only ever needs a single moderator.
export const ADMIN_UID = 'HfksT06CgFUkZ9s4vrzEGs85O562'

export function isAdmin(user) {
  return user?.uid === ADMIN_UID
}
