import qrcode from 'qrcode-generator'

const QUIET_ZONE = 4 // modules of white border, as the QR spec requires

// Crisp SVG QR code, same as bill-splitter's. Used on the printable poster
// (Poster.jsx). The white quiet zone is part of the SVG so it prints too.
export default function QrSvg({ value, size, level = 'M' }) {
  const qr = qrcode(0, level)
  qr.addData(value, /^[0-9A-Z $%*+\-./:]*$/.test(value) ? 'Alphanumeric' : 'Byte')
  qr.make()
  const n = qr.getModuleCount()
  let d = ''
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c)) d += `M${c + QUIET_ZONE} ${r + QUIET_ZONE}h1v1h-1z`
    }
  }
  const total = n + QUIET_ZONE * 2
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox={`0 0 ${total} ${total}`} shapeRendering="crispEdges" role="img" aria-label="QR code">
      <rect width={total} height={total} fill="#ffffff" />
      <path d={d} fill="#000000" />
    </svg>
  )
}
