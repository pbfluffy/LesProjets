import { useRef, useState } from 'react'

const ACCEPTED = '.pdf,image/*'
const MAX_FILES = 6
const MAX_FILE_BYTES = 15 * 1024 * 1024 // 15MB — Anthropic's own per-file cap is higher, but this keeps uploads fast

export default function InputPanel({ onGenerate, busy, error }) {
  const [text, setText] = useState('')
  const [files, setFiles] = useState([])
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  function addFiles(fileList) {
    const incoming = Array.from(fileList)
    const oversized = incoming.find((f) => f.size > MAX_FILE_BYTES)
    if (oversized) {
      alert(`"${oversized.name}" is over 15MB — try a smaller file or a cropped screenshot.`)
      return
    }
    setFiles((prev) => [...prev, ...incoming].slice(0, MAX_FILES))
  }

  function removeFile(index) {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!text.trim() && files.length === 0) return
    onGenerate({ text, files })
  }

  return (
    <form className="input-panel" onSubmit={handleSubmit}>
      <label className="field-label" htmlFor="trip-notes">
        Paste anything — notes, a half-written email, flight numbers
      </label>
      <textarea
        id="trip-notes"
        className="notes-area"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="kyoto nov 15-22, flying JL706, staying somewhere in gion, friends said fushimi inari early morning..."
        rows={9}
      />

      <div
        className={`dropzone ${dragOver ? 'drag-over' : ''}`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          addFiles(e.dataTransfer.files)
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click()
        }}
      >
        <p className="dropzone-title">Drop PDFs or screenshots here, or click to browse</p>
        <p className="dropzone-sub">Flight confirmations, booking emails, hand-typed lists — up to {MAX_FILES} files</p>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED}
          multiple
          hidden
          onChange={(e) => {
            addFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {files.length > 0 && (
        <ul className="file-chips">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="file-chip">
              <span>{f.name}</span>
              <button type="button" onClick={() => removeFile(i)} aria-label={`Remove ${f.name}`}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <div className="form-error">{error}</div>}

      <button type="submit" className="btn-primary" disabled={busy || (!text.trim() && files.length === 0)}>
        {busy ? 'Reading your trip…' : 'Generate itinerary'}
      </button>
    </form>
  )
}
