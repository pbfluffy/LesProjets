// Deterministic hue per tag name so tags stay visually distinguishable
// (and the same tag always gets the same color) without storing a color
// choice anywhere — it's derived purely from the tag text.
export function tagHue(tag) {
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = (hash * 31 + tag.charCodeAt(i)) >>> 0
  }
  return hash % 360
}
