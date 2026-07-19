// The AI's breed guess is stored as raw English text (Gemini's output), not
// a translation key — so it'd show/match untranslated even in the Thai UI.
// "mixed breed" is the overwhelming common case for street dogs, so that
// one value is worth localizing; specific breed guesses (e.g. "Thai
// Bangkaew mix") stay in English since there's no translation for
// arbitrary AI output. Shared by DogDetail's display and searchDogs's
// matching, so searching in Thai finds dogs by the breed term actually
// shown on screen, not just the underlying English value.
export function localizedBreed(breedGuess, lang) {
  if (lang === 'th' && breedGuess?.trim().toLowerCase() === 'mixed breed') {
    return 'พันทาง'
  }
  return breedGuess
}
