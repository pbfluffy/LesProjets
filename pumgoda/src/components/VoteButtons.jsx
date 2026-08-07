import { useEffect, useState } from 'react'
import { useVotesCtx } from '../hooks/VotesContext'
import { STRINGS, interp } from '../i18n/strings'
import './VoteButtons.css'

// Community confidence — three quick signals visitors can leave on a place.
// One vote per user per place (Firestore-backed, signed-in only — see useVotesFs).

const SIGNALS = [
  { key: 'up', emoji: '👍' },
  { key: 'paw', emoji: '🐾' },
  { key: 'warn', emoji: '⚠️' },
]

const NOTES_SHOWN = 4

export default function VoteButtons({ placeId, lang }) {
  const s = STRINGS[lang] || STRINGS.en
  const {
    tallies, myVotes, notesByPlace, status, lastError, submitVote, submitNote, clearError, user, NOTE_MAX_LEN,
  } = useVotesCtx()
  const counts = tallies[placeId] || { up: 0, paw: 0, warn: 0 }
  const myVote = myVotes[placeId]
  const voted = Boolean(myVote)
  const mySignal = myVote ? SIGNALS.find((x) => x.key === myVote) : null
  const myLabel = mySignal ? mySignal.emoji + ' ' + (s.vote[myVote] || myVote) : ''
  const canVote = Boolean(user)

  const allNotes = notesByPlace[placeId] || []
  const myNote = user ? allNotes.find((n) => n.uid === user.uid)?.note || '' : ''
  const othersNotes = allNotes.filter((n) => !user || n.uid !== user.uid)
  const [editingNote, setEditingNote] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')
  const [noteSaving, setNoteSaving] = useState(false)

  useEffect(() => {
    if (!lastError) return
    const id = setTimeout(() => clearError(), 3000)
    return () => clearTimeout(id)
  }, [lastError, clearError])

  function startEditingNote() {
    setNoteDraft(myNote)
    setEditingNote(true)
  }
  async function saveNote() {
    setNoteSaving(true)
    try {
      await submitNote(placeId, noteDraft)
      setEditingNote(false)
    } finally {
      setNoteSaving(false)
    }
  }

  return (
    <div className="ph-votes">
      <div className="ph-votes-head">{s.vote.heading}</div>
      <div className="ph-votes-row">
        {SIGNALS.map((sig) => {
          const isMine = myVote === sig.key
          const cls =
            'ph-vote-btn' +
            (isMine ? ' is-mine' : '') +
            (voted && !isMine ? ' is-dim' : '')
          return (
            <button
              key={sig.key}
              type="button"
              className={cls}
              onClick={() => submitVote(placeId, sig.key)}
              disabled={!canVote}
              style={!canVote ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
            >
              <span className="ph-vote-emoji" aria-hidden="true">
                {sig.emoji}
              </span>
              <span className="ph-vote-label">{s.vote[sig.key]}</span>
              <span className="ph-vote-count">{counts[sig.key]}</span>
            </button>
          )
        })}
      </div>
      <div className="ph-votes-foot">
        {!canVote
          ? s.vote.signInPrompt
          : status === 'error'
            ? s.vote.error
            : voted
              ? interp(s.vote.yourPick, { label: myLabel })
              : s.vote.prompt}
      </div>
      {lastError && <div className="ph-votes-err" role="status">{s.vote.saveError}</div>}

      {voted && (
        <div className="ph-note-mine">
          {editingNote ? (
            <div className="ph-note-edit">
              <textarea
                className="ph-note-input"
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value.slice(0, NOTE_MAX_LEN))}
                placeholder={s.vote.notePlaceholder}
                maxLength={NOTE_MAX_LEN}
                rows={2}
                autoFocus
              />
              <div className="ph-note-actions">
                <span className="ph-note-len">{noteDraft.length}/{NOTE_MAX_LEN}</span>
                <button type="button" className="ph-note-btn ph-note-btn-ghost" onClick={() => setEditingNote(false)} disabled={noteSaving}>
                  {s.vote.noteCancel}
                </button>
                <button type="button" className="ph-note-btn" onClick={saveNote} disabled={noteSaving}>
                  {noteSaving ? '…' : s.vote.noteSave}
                </button>
              </div>
            </div>
          ) : myNote ? (
            <div className="ph-note-display">
              <span className="ph-note-text">💬 {myNote}</span>
              <button type="button" className="ph-note-editBtn" onClick={startEditingNote} aria-label={s.vote.editNote} title={s.vote.editNote}>✎</button>
            </div>
          ) : (
            <button type="button" className="ph-note-addBtn" onClick={startEditingNote}>
              + {s.vote.addNote}
            </button>
          )}
        </div>
      )}

      {othersNotes.length > 0 && (
        <div className="ph-notes-list">
          <div className="ph-notes-list-head">{s.vote.recentNotes}</div>
          {othersNotes.slice(0, NOTES_SHOWN).map((n, i) => {
            const sig = SIGNALS.find((x) => x.key === n.vote)
            return (
              <div key={i} className="ph-note-item">
                <span aria-hidden="true">{sig ? sig.emoji : ''}</span>
                <span className="ph-note-item-text">{n.note}</span>
              </div>
            )
          })}
          {othersNotes.length > NOTES_SHOWN && (
            <div className="ph-notes-more">{interp(s.vote.moreNotes, { count: othersNotes.length - NOTES_SHOWN })}</div>
          )}
        </div>
      )}
    </div>
  )
}
