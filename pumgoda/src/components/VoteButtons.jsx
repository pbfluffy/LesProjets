import { useVotes } from '../hooks/useVotes'
import { STRINGS } from '../i18n/strings'
import './VoteButtons.css'

// Community confidence — three quick signals visitors can leave on a place.
// One vote per place per device (enforced in useVotes via localStorage).

const SIGNALS = [
  { key: 'up', emoji: '👍' },
  { key: 'paw', emoji: '🐾' },
  { key: 'warn', emoji: '⚠️' },
]

export default function VoteButtons({ placeId, lang }) {
  const s = STRINGS[lang] || STRINGS.en
  const { tallies, myVotes, status, submitVote } = useVotes()
  const counts = tallies[placeId] || { up: 0, paw: 0, warn: 0 }
  const myVote = myVotes[placeId]
  const voted = Boolean(myVote)

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
              disabled={voted}
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
        {status === 'error'
          ? s.vote.error
          : voted
            ? s.vote.thanks
            : s.vote.prompt}
      </div>
    </div>
  )
}
