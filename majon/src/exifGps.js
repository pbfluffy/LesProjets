// Best-effort GPS extraction from a JPEG's EXIF metadata.
//
// Camera photos taken with location services on usually carry GPS tags;
// photos re-saved or re-shared through messaging apps (LINE, etc.) almost
// always have EXIF stripped by the re-compression, so this is a first try,
// not a guarantee — callers should fall back to navigator.geolocation when
// this returns null. Must run on the ORIGINAL file, before any canvas-based
// compression, since drawing to canvas strips all metadata.

const TYPE_SIZE = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8 }

export async function readExifGps(file) {
  try {
    if (!file.type || file.type !== 'image/jpeg') return null
    // GPS tags live in IFD0, always near the start of the file — 128KB is
    // generous headroom without reading the whole (possibly large) photo.
    const buffer = await file.slice(0, 128 * 1024).arrayBuffer()
    const view = new DataView(buffer)
    if (view.getUint16(0) !== 0xffd8) return null // not a JPEG (SOI marker)

    let offset = 2
    while (offset < view.byteLength - 4) {
      const marker = view.getUint16(offset)
      if ((marker & 0xff00) !== 0xff00) break
      if (marker === 0xffe1) return parseExifApp1(view, offset + 4)
      const size = view.getUint16(offset + 2)
      offset += 2 + size
    }
    return null
  } catch {
    return null // malformed/truncated data — just skip EXIF, don't crash the report flow
  }
}

function parseExifApp1(view, start) {
  // "Exif\0\0"
  if (view.getUint32(start) !== 0x45786966 || view.getUint16(start + 4) !== 0x0000) return null
  const tiffStart = start + 6
  const little = view.getUint16(tiffStart) === 0x4949
  const ifd0Offset = view.getUint32(tiffStart + 4, little)
  const ifd0 = readIfdEntries(view, tiffStart, tiffStart + ifd0Offset, little)

  const gpsPointer = ifd0.find((e) => e.tag === 0x8825)
  if (!gpsPointer) return null
  const gpsIfdOffset = readLong(view, gpsPointer, little)
  const gpsIfd = readIfdEntries(view, tiffStart, tiffStart + gpsIfdOffset, little)

  const latRef = readAscii(view, gpsIfd.find((e) => e.tag === 1))
  const lat = readRationalTriplet(view, gpsIfd.find((e) => e.tag === 2), little)
  const lngRef = readAscii(view, gpsIfd.find((e) => e.tag === 3))
  const lng = readRationalTriplet(view, gpsIfd.find((e) => e.tag === 4), little)

  if (lat == null || lng == null) return null
  const signedLat = latRef === 'S' ? -lat : lat
  const signedLng = lngRef === 'W' ? -lng : lng
  if (!Number.isFinite(signedLat) || !Number.isFinite(signedLng)) return null
  if (signedLat === 0 && signedLng === 0) return null // common "no fix" placeholder
  return { lat: signedLat, lng: signedLng }
}

function readIfdEntries(view, tiffStart, ifdOffset, little) {
  const count = view.getUint16(ifdOffset, little)
  const entries = []
  for (let i = 0; i < count; i++) {
    const entryOffset = ifdOffset + 2 + i * 12
    const tag = view.getUint16(entryOffset, little)
    const type = view.getUint16(entryOffset + 2, little)
    const numValues = view.getUint32(entryOffset + 4, little)
    const valueFieldOffset = entryOffset + 8
    const unitSize = TYPE_SIZE[type] || 1
    const totalBytes = unitSize * numValues
    const dataOffset = totalBytes <= 4 ? valueFieldOffset : tiffStart + view.getUint32(valueFieldOffset, little)
    entries.push({ tag, type, numValues, dataOffset })
  }
  return entries
}

function readAscii(view, entry) {
  if (!entry) return null
  let s = ''
  for (let i = 0; i < entry.numValues; i++) {
    const c = view.getUint8(entry.dataOffset + i)
    if (c === 0) break
    s += String.fromCharCode(c)
  }
  return s
}

function readLong(view, entry, little) {
  if (!entry) return null
  return view.getUint32(entry.dataOffset, little)
}

function readRational(view, offset, little) {
  const num = view.getUint32(offset, little)
  const den = view.getUint32(offset + 4, little)
  return den === 0 ? 0 : num / den
}

function readRationalTriplet(view, entry, little) {
  if (!entry || entry.numValues < 3) return null
  const deg = readRational(view, entry.dataOffset, little)
  const min = readRational(view, entry.dataOffset + 8, little)
  const sec = readRational(view, entry.dataOffset + 16, little)
  return deg + min / 60 + sec / 3600
}
