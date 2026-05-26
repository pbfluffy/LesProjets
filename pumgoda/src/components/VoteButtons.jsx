import { useEffect } from 'react'
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

export default function VoteButtons({ placeId, lang }) {
  const s = STRINGS[lang] || STRINGS.en
  const { tallies, myVotes, status, lastError, submitVote, clearError, user } = useVotesCtx()
  const counts = tallies[placeId] || { up: 0, paw: 0, warn: 0 }
  const myVote = myVotes[placeId]
  const voted = Boolean(myVote)
  const mySignal = myVote ? SIGNALS.find((x) => x.key === myVote) : null
  const myLabel = mySignal ? mySignal.emoji + ' ' + (s.vote[myVote] || myVote) : ''
  const canVote = Boolean(user)

  useEffect(() => {
    if (!lastError) return
    const id = setTimeout(() => clearError(), 3000)
    return () => clearTimeout(id)
  }, [lastError, clearError])

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
    </div>
  )
}
