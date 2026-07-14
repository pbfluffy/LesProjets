import { useEffect, useState } from 'react'
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth'
import { auth } from '../firebase.js'

// Mirrors the Firebase Auth session into React state. `user` is null until
// Firebase resolves the initial auth state (see `loading`), then either
// null (signed out) or the Firebase User object.
export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
  }, [])

  return { user, loading }
}

const googleProvider = new GoogleAuthProvider()

export async function signInWithGoogle() {
  await signInWithPopup(auth, googleProvider)
}

export async function signOutAdmin() {
  await signOut(auth)
}
