import { useState, useEffect, useCallback } from 'react'

// Lightweight localStorage-backed hook for the user's pet photo.
// Stored as a JPEG data URL (resized to 240px by the caller, ~20 KB).
// Single-pet for v1; multi-pet lands with the vote feature in v2.

const STORAGE_KEY = 'pumgoda_user_pet_v1'

export function useUserPet() {
  const [petPhoto, setPetPhotoState] = useState(null)

  // Hydrate from storage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setPetPhotoState(stored)
    } catch {
      // localStorage unavailable (private mode quirks, quota cleared) — fall back to default
    }
  }, [])

  const setPetPhoto = useCallback((dataUrl) => {
    try {
      localStorage.setItem(STORAGE_KEY, dataUrl)
      setPetPhotoState(dataUrl)
    } catch (err) {
      // Quota exceeded or unavailable — surface to console but don't crash
      console.warn('[useUserPet] could not save pet photo:', err)
    }
  }, [])

  const clearPetPhoto = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
    setPetPhotoState(null)
  }, [])

  return { petPhoto, setPetPhoto, clearPetPhoto, isCustom: !!petPhoto }
}
